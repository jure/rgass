const Rgass = require('../rgass.js')

describe('initial model', () => {
  let model = new Rgass.Model()

  it('can perform a local insertion', () => {
    model.LocalInsert(0, 0, 'hello', 'keyCur')
  })

  it('can perform a remote insertion', () => {
    model.RemoteInsert(0, 'keyTar missing', 'hello', 'keyCur missing')
  })
})
