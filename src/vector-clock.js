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
    let clocks = Object.values(this.clocks)
    if (clocks.length === 0) {
      return 0
    } else {
      return clocks.reduce((a, b) => a + b)
    }
  }
}

module.exports = VectorClock
