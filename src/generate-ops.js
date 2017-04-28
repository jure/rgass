const log = require('./logger')

const diffToOps = (diff, model, view) => {
  var start = diff[0]
  var end = diff[1]
  var newstr = diff[2]
  var result = []

  let targetNode, positionWithinNode

  // KEY
  // Definition 3. Identifier IDÞ of each node is a five-tuple hs, ssv, site, offset, len where
  // (1) s is the identifier of session, a global increas- ing number.
  // (2) ssv is the sum of state vector of an operation.
  // (3) site is the unique identifier of the site.
  // (4) offset is the length from the leftmost position of the current node to the leftmost position of the original node.
  // - - - - | - - - | - - - - |
  //
  // (5) len is the length of string contained in the current node.

  // DELETE (tar key; pos; del len; key)
  // deletion

  if (end - start !== 0) {
    [targetNode, positionWithinNode] = view.nodeAtPosition(start + 1)
    let key = {
      session: 1,
      ssv: model.incrementVectorClock(),
      site: model.siteId,
      offset: 0,
      length: end - start
    }
    result.push({
      type: 'delete',
      targetKey: targetNode && targetNode.data.key,
      position: positionWithinNode,
      delLength: end - start,
      key: key
    })
  }

  // INSERT (targetKey, positionWithinNode, str, key)
  // insertion
  if (newstr.length) {
    [targetNode, positionWithinNode] = view.nodeAtPosition(start)
    let key = {
      session: 1,
      ssv: model.incrementVectorClock(),
      site: model.siteId,
      offset: 0,
      length: newstr.length
    }

    result.push({
      type: 'insert',
      position: positionWithinNode,
      targetKey: targetNode && targetNode.data.key,
      str: newstr,
      key: key
    })
  }

  log('generate ops', model.siteId, result)
  return result
}

const getDiff = (oldText, newText, cursor) => {
  // log('generate ops', oldText, newText, cursor)

  var delta = newText.length - oldText.length
  var limit = Math.max(0, cursor - delta)
  var end = oldText.length
  while (end > limit && oldText.charAt(end - 1) === newText.charAt(end + delta - 1)) {
    end -= 1
  }
  var start = 0
  var startLimit = cursor - Math.max(0, delta)
  while (start < startLimit && oldText.charAt(start) === newText.charAt(start)) {
    start += 1
  }
  return [start, end, newText.slice(start, end + delta)]
}

const generateOps = (options) => {
  var diff = getDiff(options.oldText, options.newText, options.cursor)
  return diffToOps(diff, options.model, options.view)
}

module.exports = generateOps
