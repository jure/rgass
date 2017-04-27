function log (type) {
  let filter = ['generate ops']

  if (filter.indexOf(type) !== -1) {
    console.log.apply(this, arguments)
  }
}

module.exports = log
