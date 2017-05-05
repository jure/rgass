const View = require('../src/rgass').View
const Model = require('../src/rgass').Model
const generateOps = require('../src/generate-ops')

describe('Model', () => {
  describe('single character insertions', () => {
    let op1 = {
      'type': 'insert',
      'position': 0,
      'str': 'a',
      'key': {
        'session': 1,
        'ssv': 1,
        'site': 1,
        'offset': 0,
        'length': 1
      }
    }

    let op2 = {
      'type': 'insert',
      'position': 1,
      'str': 'b',
      'key': {
        'session': 1,
        'ssv': 2,
        'site': 1,
        'offset': 1,
        'length': 1
      },
      'targetKey': {
        'session': 1,
        'ssv': 1,
        'site': 1,
        'offset': 0,
        'length': 1
      }
    }

    let op3 = {
      'type': 'insert',
      'position': 0,
      'str': 'c',
      'key': {
        'session': 1,
        'ssv': 3,
        'site': 1,
        'offset': 0,
        'length': 1
      }
    }

    let op4 = {
      'type': 'insert',
      'position': 1,
      'str': 'd',
      'key': {
        'session': 1,
        'ssv': 4,
        'site': 1,
        'offset': 1,
        'length': 1
      },
      'targetKey': {
        'session': 1,
        'ssv': 3,
        'site': 1,
        'offset': 0,
        'length': 1
      }
    }

    it('can perform local insertion operations', () => {
      let model = new Model({
        siteId: 1,
        session: 1
      })

      model.applyOperations([op1])
      model.applyOperations([op2])
      model.applyOperations([op3])
      model.applyOperations([op4])

      let view = new View()
      view.synchronize(model)

      expect(view.toString()).toEqual('cdab')
    })

    it('can synchronize with remote sites', () => {
      let remoteModel = new Model({
        siteId: 2,
        session: 1
      })

      let localModel = new Model({
        siteId: 1,
        session: 1,
        broadcast: (operations) => remoteModel.applyRemoteOperations(operations)
      })

      localModel.applyOperations([op1])
      localModel.applyOperations([op2])
      localModel.applyOperations([op3])
      localModel.applyOperations([op4])

      let view = new View()
      view.synchronize(remoteModel)

      expect(view.toString()).toEqual('cdab')
    })

    it('can synchronize with remote sites #2', () => {
      let remoteModel = new Model({
        siteId: 2,
        session: 1
      })

      let localModel = new Model({
        siteId: 1,
        session: 1,
        broadcast: (operations) => remoteModel.applyRemoteOperations(operations)
      })

      remoteModel.broadcast = (operations) => localModel.applyRemoteOperations(operations)

      let localView = new View()
      localView.synchronize(localModel)

      localModel.applyOperations(generateOps({
        oldText: '',
        newText: 'A',
        cursor: 1,
        model: localModel,
        view: localView
      }))

      localView.synchronize(localModel)

      localModel.applyOperations(generateOps({
        oldText: 'A',
        newText: 'AB',
        cursor: 2,
        model: localModel,
        view: localView
      }))

      let remoteView = new View()
      remoteView.synchronize(remoteModel)

      remoteModel.applyOperations(generateOps({
        oldText: 'AB',
        newText: 'ABC',
        cursor: 3,
        model: remoteModel,
        view: remoteView
      }))

      localView.synchronize(localModel)
      expect(localView.toString()).toEqual('ABC')

      console.log(remoteModel.lModel.nodes())
      remoteView.synchronize(remoteModel)
      expect(remoteView.toString()).toEqual('ABC')
    })
  })

  describe('string (multichar) insertions', () => {
    let op1 = {
      'type': 'insert',
      'position': 0,
      'str': 'RGASS',
      'key': {
        'session': 1,
        'ssv': 1,
        'site': 1,
        'offset': 0,
        'length': 5
      }
    }

    let midInsertion = {
      'type': 'insert',
      'position': 2,
      'targetKey': {
        'session': 1,
        'ssv': 1,
        'site': 1,
        'offset': 0,
        'length': 5
      },
      'str': 'B',
      'key': {
        'session': 1,
        'ssv': 2,
        'site': 1,
        'offset': 2,
        'length': 1
      }
    }

    it('can perform local mid-node insertions', () => {
      let model = new Model({
        siteId: 1,
        session: 1
      })

      model.applyOperations([op1])
      model.applyOperations([midInsertion])

      let view = new View()
      view.synchronize(model)

      expect(view.toString()).toEqual('RGBASS')
    })

    it('can perform remote mid-node insertions', () => {
      let remoteModel = new Model({
        siteId: 2,
        session: 1
      })

      let localModel = new Model({
        siteId: 1,
        session: 1,
        broadcast: (operations) => remoteModel.applyRemoteOperations(operations)
      })

      localModel.applyOperations([op1])
      localModel.applyOperations([midInsertion])

      let view = new View()
      view.synchronize(remoteModel)

      expect(view.toString()).toEqual('RGBASS')
    })

    it('sets the new split nodes length correctly', () => {
      let ops = [
        {
          'type': 'insert',
          'position': 0,
          'str': 'RGASS',
          'key': {
            'session': 1,
            'ssv': 1,
            'site': 1,
            'offset': 0,
            'length': 5
          }
        },
        {
          'type': 'insert',
          'position': 2,
          'targetKey': {
            'session': 1,
            'ssv': 1,
            'site': 1,
            'offset': 0,
            'length': 5
          },
          'str': 'b',
          'key': {
            'session': 1,
            'ssv': 2,
            'site': 1,
            'offset': 2,
            'length': 1
          }
        }
      ]

      let model = new Model({
        siteId: 1,
        session: 1
      })

      model.applyOperations(ops)

      let view = new View()
      view.synchronize(model)

      let expectedLengths = [2, 1, 3]
      let nodeNumber = 0
      model.lModel.traverse(node => {
        expect(node.data.key.length).toEqual(expectedLengths[nodeNumber])
        nodeNumber++
      })

      expect(view.toString()).toEqual('RGbASS')
    })

    it('can correctly sync concurrent mid-node insertions', () => {
      let remoteModelRemoteOperations = []
      let localModelRemoteOperations = []

      let remoteModel = new Model({
        siteId: 1,
        session: 1,
        broadcast: (operations) => {
          localModel.applyRemoteOperations(operations)
        }
      })

      let localModel = new Model({
        siteId: 2,
        session: 1,
        broadcast: (operations) => {
          remoteModel.applyRemoteOperations(operations)
        }
      })

      let localView = new View()
      localView.synchronize(localModel)

      let remoteView = new View()
      remoteView.synchronize(remoteModel)

      localModel.applyOperations(generateOps({
        oldText: '',
        newText: 'Network transmitting normally',
        cursor: 26,
        model: localModel,
        view: localView
      }))

      localView.synchronize(localModel)
      remoteView.synchronize(remoteModel)

      remoteModel.broadcast = (operations) => {
        localModelRemoteOperations = localModelRemoteOperations.concat(operations)
      }

      localModel.broadcast = (operations) => {
        remoteModelRemoteOperations = remoteModelRemoteOperations.concat(operations)
      }

      localModel.applyOperations(generateOps({
        oldText: 'Network transmitting normally',
        newText: 'Network transimitting normally',
        cursor: 14,
        model: localModel,
        view: localView
      }))

      localView.synchronize(localModel)

      remoteModel.applyOperations(generateOps({
        oldText: 'Network transmitting normally',
        newText: 'Network transmittingg normally',
        cursor: 21,
        model: remoteModel,
        view: remoteView
      }))

      remoteView.synchronize(remoteModel)

      localModel.applyRemoteOperations(localModelRemoteOperations)
      console.log('remote operations to local', localModelRemoteOperations)

      remoteModel.applyRemoteOperations(remoteModelRemoteOperations)
      console.log('remote operations to remote', remoteModelRemoteOperations)

      let remoteNodes = []
      let localNodes = []
      remoteModel.lModel.traverse(node => remoteNodes.push(node.data.str))
      localModel.lModel.traverse(node => localNodes.push(node.data.str))

      expect(remoteNodes).toEqual(localNodes)

      localModelRemoteOperations.length = 0
      remoteModelRemoteOperations.length = 0

      localView.synchronize(localModel)
      remoteView.synchronize(remoteModel)

      expect(localView.toString()).toEqual('Network transimittingg normally')
      expect(remoteView.toString()).toEqual('Network transimittingg normally')
    })
  })

  describe('single character deletions', () => {
    it('can delete a single character', () => {
      // This also tests view synchronization as it's the easiest
      // way to generate operations

      let model = new Model({
        siteId: 1,
        session: 1
      })
      let view = new View()
      view.synchronize(model)

      model.applyOperations(generateOps({
        oldText: '',
        newText: 'a',
        cursor: 1,
        model: model,
        view: view
      }))

      view.synchronize(model)

      model.applyOperations(generateOps({
        oldText: 'a',
        newText: 'ab',
        cursor: 2,
        model: model,
        view: view
      }))

      view.synchronize(model)

      model.applyOperations(generateOps({
        oldText: 'ab',
        newText: 'a',
        cursor: 1,
        model: model,
        view: view
      }))

      view.synchronize(model)

      expect(view.toString()).toEqual('a')
    })

    it('can synchronize a single character deletion', () => {
      // This also tests view synchronization as it's the easiest
      // way to generate operations

      let remoteModel = new Model({
        siteId: 2,
        session: 1
      })

      let localModel = new Model({
        siteId: 1,
        session: 1,
        broadcast: (operations) => remoteModel.applyRemoteOperations(operations)
      })

      let view = new View()
      view.synchronize(localModel)

      localModel.applyOperations(generateOps({
        oldText: '',
        newText: 'a',
        cursor: 1,
        model: localModel,
        view: view
      }))

      view.synchronize(localModel)

      localModel.applyOperations(generateOps({
        oldText: 'a',
        newText: 'ab',
        cursor: 2,
        model: localModel,
        view: view
      }))

      view.synchronize(localModel)

      localModel.applyOperations(generateOps({
        oldText: 'ab',
        newText: 'a',
        cursor: 1,
        model: localModel,
        view: view
      }))

      view.synchronize(localModel)
      let remoteView = new View()
      remoteView.synchronize(remoteModel)

      expect(view.toString()).toEqual('a')
      expect(remoteView.toString()).toEqual('a')
    })
  })

  describe('multichar deletions', () => {
    it('can delete by creating a mid-point split node (into 3 nodes)', () => {
      let model = new Model({
        siteId: 1,
        session: 1
      })

      let view = new View()
      view.synchronize(model)

      model.applyOperations(generateOps({
        oldText: '',
        newText: 'ABCDEFGHIJ',
        cursor: 10,
        model: model,
        view: view
      }))

      view.synchronize(model)

      model.applyOperations(generateOps({
        oldText: 'ABCDEFGHIJ',
        newText: 'ABCHIJ',
        cursor: 3,
        model: model,
        view: view
      }))

      view.synchronize(model)

      expect(view.toString()).toEqual('ABCHIJ')
    })

    it('can delete by creating a split node (deleting the last of the new 2 nodes)', () => {
      let model = new Model({
        siteId: 1,
        session: 1
      })

      let view = new View()
      view.synchronize(model)

      model.applyOperations(generateOps({
        oldText: '',
        newText: 'Gratinated',
        cursor: 10,
        model: model,
        view: view
      }))

      view.synchronize(model)

      model.applyOperations(generateOps({
        oldText: 'Gratinated',
        newText: 'Gratina',
        cursor: 7,
        model: model,
        view: view
      }))

      view.synchronize(model)

      expect(view.toString()).toEqual('Gratina')
    })

    it('can delete by creating a split node (deleting the first of the new 2 nodes)', () => {
      let model = new Model({
        siteId: 1,
        session: 1
      })

      let view = new View()
      view.synchronize(model)

      model.applyOperations(generateOps({
        oldText: '',
        newText: 'Gratinated',
        cursor: 10,
        model: model,
        view: view
      }))

      view.synchronize(model)

      model.applyOperations(generateOps({
        oldText: 'Gratinated',
        newText: 'nated',
        cursor: 0,
        model: model,
        view: view
      }))

      view.synchronize(model)

      expect(view.toString()).toEqual('nated')
    })

    it('can delete multiple nodes', () => {
      let model = new Model({
        siteId: 1,
        session: 1
      })

      let view = new View()
      view.synchronize(model)

      model.applyOperations(generateOps({
        oldText: '',
        newText: 'Gratinated',
        cursor: 10,
        model: model,
        view: view
      }))

      view.synchronize(model)

      model.applyOperations(generateOps({
        oldText: 'Gratinated',
        newText: 'GratinatedHighjacked',
        cursor: 20,
        model: model,
        view: view
      }))

      view.synchronize(model)

      model.applyOperations(generateOps({
        oldText: 'GratinatedHighjacked',
        newText: 'Gratincked',
        cursor: 6,
        model: model,
        view: view
      }))

      view.synchronize(model)

      expect(view.toString()).toEqual('Gratincked')
    })

    it('can delete more multiple nodes', () => {
      let model = new Model({
        siteId: 1,
        session: 1
      })

      let view = new View()
      view.synchronize(model)

      model.applyOperations(generateOps({
        oldText: '',
        newText: 'abc',
        cursor: 3,
        model: model,
        view: view
      }))

      view.synchronize(model)

      model.applyOperations(generateOps({
        oldText: 'abc',
        newText: 'abcdef',
        cursor: 6,
        model: model,
        view: view
      }))

      view.synchronize(model)

      model.applyOperations(generateOps({
        oldText: 'abcdef',
        newText: 'abcdefghi',
        cursor: 9,
        model: model,
        view: view
      }))

      view.synchronize(model)

      model.applyOperations(generateOps({
        oldText: 'abcdefghi',
        newText: 'abi',
        cursor: 2,
        model: model,
        view: view
      }))

      view.synchronize(model)

      expect(view.toString()).toEqual('abi')
    })

    it('can delete nodes after one of them has been split', () => {
      let model = new Model({
        siteId: 1,
        session: 1
      })

      let view = new View()
      view.synchronize(model)

      model.applyOperations(generateOps({
        oldText: '',
        newText: 'ABCDEFGH',
        cursor: 8,
        model: model,
        view: view
      }))

      view.synchronize(model)

      model.applyOperations(generateOps({
        oldText: 'ABCDEFGH',
        newText: 'ABCDGH',
        cursor: 4,
        model: model,
        view: view
      }))

      view.synchronize(model)

      model.applyOperations(generateOps({
        oldText: 'ABCDGH',
        newText: '',
        cursor: 0,
        model: model,
        view: view
      }))

      view.synchronize(model)

      expect(view.toString()).toEqual('')
    })

    it('can synchronize multi-node deletions', () => {
      let remoteModel = new Model({
        siteId: 2,
        session: 1
      })

      let localModel = new Model({
        siteId: 1,
        session: 1,
        broadcast: (operations) => remoteModel.applyRemoteOperations(operations)
      })

      let view = new View()
      view.synchronize(localModel)

      localModel.applyOperations(generateOps({
        oldText: '',
        newText: 'abc',
        cursor: 3,
        model: localModel,
        view: view
      }))

      view.synchronize(localModel)

      localModel.applyOperations(generateOps({
        oldText: 'abc',
        newText: 'abcdef',
        cursor: 6,
        model: localModel,
        view: view
      }))

      view.synchronize(localModel)

      localModel.applyOperations(generateOps({
        oldText: 'abcdef',
        newText: 'abcdefghi',
        cursor: 9,
        model: localModel,
        view: view
      }))

      view.synchronize(localModel)

      localModel.applyOperations(generateOps({
        oldText: 'abcdefghi',
        newText: 'abi',
        cursor: 2,
        model: localModel,
        view: view
      }))

      view.synchronize(localModel)

      expect(view.toString()).toEqual('abi')

      let remoteView = new View()
      remoteView.synchronize(remoteModel)

      expect(remoteView.toString()).toEqual('abi')
    })

    it('can synchronize multi-node deletions of everything', () => {
      let remoteModel = new Model({
        siteId: 2,
        session: 1
      })

      let localModel = new Model({
        siteId: 1,
        session: 1,
        broadcast: (operations) => remoteModel.applyRemoteOperations(operations)
      })

      let view = new View()
      view.synchronize(localModel)

      localModel.applyOperations(generateOps({
        oldText: '',
        newText: 'A',
        cursor: 1,
        model: localModel,
        view: view
      }))

      view.synchronize(localModel)

      localModel.applyOperations(generateOps({
        oldText: 'A',
        newText: 'AB',
        cursor: 2,
        model: localModel,
        view: view
      }))

      view.synchronize(localModel)

      localModel.applyOperations(generateOps({
        oldText: 'AB',
        newText: '',
        cursor: 0,
        model: localModel,
        view: view
      }))

      view.synchronize(localModel)

      expect(view.toString()).toEqual('')

      let remoteView = new View()
      remoteView.synchronize(remoteModel)

      expect(remoteView.toString()).toEqual('')

      let remoteNodes = []
      let localNodes = []
      remoteModel.lModel.traverse(node => remoteNodes.push(node.data.str))
      localModel.lModel.traverse(node => localNodes.push(node.data.str))

      expect(remoteNodes).toEqual(localNodes)
    })

    it('regression test - overlapping deletions', () => {
      let remoteModelRemoteOperations = []
      let localModelRemoteOperations = []

      let remoteModel = new Model({
        siteId: 2,
        session: 1,
        broadcast: (operations) => {
          localModelRemoteOperations = localModelRemoteOperations.concat(operations)
        }
      })

      let localModel = new Model({
        siteId: 1,
        session: 1,
        broadcast: (operations) => {
          remoteModelRemoteOperations = remoteModelRemoteOperations.concat(operations)
        }
      })

      let localView = new View()
      localView.synchronize(localModel)

      let remoteView = new View()
      remoteView.synchronize(remoteModel)

      localModel.applyOperations(generateOps({
        oldText: '',
        newText: '',
        cursor: 0,
        model: localModel,
        view: localView
      }))

      remoteModel.applyOperations(generateOps({
        oldText: '',
        newText: 'wtuv',
        cursor: 4,
        model: remoteModel,
        view: remoteView
      }))

      localModel.applyRemoteOperations(localModelRemoteOperations)
      remoteModel.applyRemoteOperations(remoteModelRemoteOperations)

      localModelRemoteOperations.length = 0
      remoteModelRemoteOperations.length = 0

      localView.synchronize(localModel)
      remoteView.synchronize(remoteModel)

      expect(localView.toString()).toEqual('wtuv')
      expect(remoteView.toString()).toEqual('wtuv')

      localModel.applyOperations(generateOps({
        oldText: 'wtuv',
        newText: 'wt',
        cursor: 2,
        model: localModel,
        view: localView
      }))

      remoteModel.applyOperations(generateOps({
        oldText: 'wtuv',
        newText: 'w',
        cursor: 1,
        model: remoteModel,
        view: remoteView
      }))

      localModel.applyRemoteOperations(localModelRemoteOperations)
      remoteModel.applyRemoteOperations(remoteModelRemoteOperations)

      localModelRemoteOperations.length = 0
      remoteModelRemoteOperations.length = 0

      localView.synchronize(localModel)
      remoteView.synchronize(remoteModel)

      expect(localView.toString()).toEqual('w')
      expect(remoteView.toString()).toEqual('w')

      let remoteNodes = []
      let localNodes = []
      remoteModel.lModel.traverse(node => remoteNodes.push(node.data.str))
      localModel.lModel.traverse(node => localNodes.push(node.data.str))

      expect(remoteNodes).toEqual(localNodes)
    })

    it('regression test - overlapping deletions #2', () => {
      let remoteModelRemoteOperations = []
      let localModelRemoteOperations = []

      let remoteModel = new Model({
        siteId: 2,
        session: 1,
        broadcast: (operations) => {
          localModelRemoteOperations = localModelRemoteOperations.concat(operations)
        }
      })

      let localModel = new Model({
        siteId: 1,
        session: 1,
        broadcast: (operations) => {
          remoteModelRemoteOperations = remoteModelRemoteOperations.concat(operations)
        }
      })

      let localView = new View()
      localView.synchronize(localModel)

      let remoteView = new View()
      remoteView.synchronize(remoteModel)

      localModel.applyOperations(generateOps({
        oldText: '',
        newText: 'transmitting',
        cursor: 12,
        model: localModel,
        view: localView
      }))

      remoteModel.applyRemoteOperations(remoteModelRemoteOperations)
      remoteModelRemoteOperations.length = 0

      localView.synchronize(localModel)
      remoteView.synchronize(remoteModel)

      expect(localView.toString()).toEqual('transmitting')
      expect(remoteView.toString()).toEqual('transmitting')

      localModel.applyOperations(generateOps({
        oldText: 'transmitting',
        newText: 'tra',
        cursor: 3,
        model: localModel,
        view: localView
      }))

      remoteModel.applyOperations(generateOps({
        oldText: 'transmitting',
        newText: 'transm',
        cursor: 6,
        model: remoteModel,
        view: remoteView
      }))

      localModel.applyRemoteOperations(localModelRemoteOperations)
      remoteModel.applyRemoteOperations(remoteModelRemoteOperations)

      localModelRemoteOperations.length = 0
      remoteModelRemoteOperations.length = 0

      localView.synchronize(localModel)
      remoteView.synchronize(remoteModel)

      expect(localView.toString()).toEqual('tra')
      expect(remoteView.toString()).toEqual('tra')

      let remoteNodes = []
      let localNodes = []
      remoteModel.lModel.traverse(node => remoteNodes.push(node.data.str))
      localModel.lModel.traverse(node => localNodes.push(node.data.str))

      expect(remoteNodes).toEqual(localNodes)
    })

    it('regression test - overlapping insertions and deletions', () => {
      let remoteModelRemoteOperations = []
      let localModelRemoteOperations = []

      let remoteModel = new Model({
        siteId: 1,
        session: 1,
        broadcast: (operations) => {
          localModel.applyRemoteOperations(operations)
        }
      })

      let localModel = new Model({
        siteId: 2,
        session: 1,
        broadcast: (operations) => {
          remoteModel.applyRemoteOperations(operations)
        }
      })

      let localView = new View()
      localView.synchronize(localModel)

      let remoteView = new View()
      remoteView.synchronize(remoteModel)

      localModel.applyOperations(generateOps({
        oldText: '',
        newText: 'Network receiving normally',
        cursor: 26,
        model: localModel,
        view: localView
      }))

      localView.synchronize(localModel)
      remoteView.synchronize(remoteModel)

      remoteModel.broadcast = (operations) => {
        localModelRemoteOperations = localModelRemoteOperations.concat(operations)
      }

      localModel.broadcast = (operations) => {
        remoteModelRemoteOperations = remoteModelRemoteOperations.concat(operations)
      }

      localModel.applyOperations(generateOps({
        oldText: 'Network receiving normally',
        newText: 'Network receiiving normally',
        cursor: 14,
        model: localModel,
        view: localView
      }))

      localView.synchronize(localModel)

      localModel.applyOperations(generateOps({
        oldText: 'Network receiiving normally',
        newText: 'Ny',
        cursor: 1,
        model: localModel,
        view: localView
      }))

      localView.synchronize(localModel)

      remoteModel.applyOperations(generateOps({
        oldText: 'Network receiving normally',
        newText: 'Network receivingg normally',
        cursor: 18,
        model: remoteModel,
        view: remoteView
      }))

      remoteView.synchronize(remoteModel)

      remoteModel.applyOperations(generateOps({
        oldText: 'Network receivingg normally',
        newText: 'Ny',
        cursor: 1,
        model: remoteModel,
        view: remoteView
      }))

      remoteView.synchronize(remoteModel)

      remoteModel.applyRemoteOperations(remoteModelRemoteOperations)
      console.log('remote operations to remote', remoteModelRemoteOperations)

      localModel.applyRemoteOperations(localModelRemoteOperations)
      console.log('remote operations to local', localModelRemoteOperations)

      let remoteNodes = []
      let localNodes = []
      remoteModel.lModel.traverse(node => remoteNodes.push(node.data.str))
      localModel.lModel.traverse(node => localNodes.push(node.data.str))

      expect(remoteNodes).toEqual(localNodes)

      localModelRemoteOperations.length = 0
      remoteModelRemoteOperations.length = 0

      localView.synchronize(localModel)
      remoteView.synchronize(remoteModel)

      expect(localView.toString()).toEqual('Ny')
      expect(remoteView.toString()).toEqual('Ny')
    })
  })
})
