const View = require('../rgass').View
const Model = require('../rgass').Model

const op1 = {
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

const op2 = {
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

const op3 = {
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

const op4 = {
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

describe('Model', () => {
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
