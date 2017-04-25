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
        newText: 'Gratinated',
        cursor: 10,
        model: model,
        view: view
      }))

      view.synchronize(model)

      model.applyOperations(generateOps({
        oldText: 'Gratinated',
        newText: 'Grated',
        cursor: 3,
        model: model,
        view: view
      }))

      view.synchronize(model)

      expect(view.toString()).toEqual('Grated')
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
  })
})
