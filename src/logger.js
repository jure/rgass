function log (type) {
  let filter = ['del']

  if (filter.indexOf(type) !== -1) {
    console.log.apply(this, arguments)
  }
}

module.exports = log
