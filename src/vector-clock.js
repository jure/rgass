class VectorClock {
  constructor () {
    this.clocks = {}
  }

  increment (nodeId) {
    if (this.clocks[nodeId]) {
      this.clocks[nodeId] = this.clocks[nodeId] + 1
    } else {
      this.clocks[nodeId] = 1
    }
  }

  value (nodeId) {
    return this.clocks[nodeId]
  }

  sum () {
    return Object.values(this.clocks).reduce((a, b) => a + b)
  }
}

module.exports = VectorClock
