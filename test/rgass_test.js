const View = require('../src/rgass').View
const Model = require('../src/rgass').Model

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
  })
})
