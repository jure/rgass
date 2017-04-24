const VectorClock = require('../src/vector-clock.js')

describe('VectorClock', () => {
  let vectorClock = new VectorClock()

  it('can increment a clock', () => {
    vectorClock.increment('site1')
    expect(vectorClock.sum()).toEqual(1)
    vectorClock.increment('site1')
    vectorClock.increment('site2')
    vectorClock.increment('site3')
    expect(vectorClock.sum()).toEqual(4)
    expect(vectorClock.value('site1')).toEqual(2)
  })
})