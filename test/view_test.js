const View = require('../rgass').View
const Model = require('../rgass').Model

describe('View', () => {
  it('finds the right node', () => {
    let model = new Model({
      siteId: 8,
      session: 1
    })

    let op1 = {
      'type': 'insert',
      'position': 0,
      'str': 'a',
      'key': {
        'session': 1,
        'ssv': 1,
        'site': 8,
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
        'site': 8,
        'offset': 1,
        'length': 1
      },
      'targetKey': {
        'session': 1,
        'ssv': 1,
        'site': 8,
        'offset': 0,
        'length': 1
      }
    }

    let op3 = {
      'type': 'insert',
      'position': 1,
      'str': 'c',
      'key': {
        'session': 1,
        'ssv': 3,
        'site': 8,
        'offset': 1,
        'length': 1
      },
      'targetKey': {
        'session': 1,
        'ssv': 2,
        'site': 8,
        'offset': 1,
        'length': 1
      }
    }

    model.applyOperations([op1])

    model.applyOperations([op2])

    model.applyOperations([op3])

    let view = new View()
    view.synchronize(model)

    let node, position
    [node, position] = view.nodeAtPosition(2)

    expect(node.data.key).toEqual(op2.key)
    expect(position).toEqual(1)
  })
})
