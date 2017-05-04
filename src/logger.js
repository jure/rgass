function log (type) {
let filter = ['generate ops', 'local operation', 'remote operation', 'split targetNode', 'localDelete', 'deleting', 'targetNode']

  if (filter.indexOf(type) !== -1) {
    console.log.apply(this, arguments)
  }
}

module.exports = log
