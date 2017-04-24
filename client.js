// diff adapted from https://github.com/google/ot-crdt-papers/blob/master/ot_toy.js

const Model = require('./src/rgass').Model
const View = require('./src/rgass').View

var textElement = document.getElementById('text')
var oldText = ''
var socket = io()
var model
var view

function broadcast (operations) {
  socket.emit('operations', operations)
}

function diffToOps (diff) {
  var start = diff[0]
  var end = diff[1]
  var newstr = diff[2]
  var result = []

  console.log(diff)
  console.log(start, end, end - start)

  let targetNode, positionWithinNode
  [targetNode, positionWithinNode] = view.nodeAtPosition(start)

  var targetKey

  if (targetNode) {
    targetKey = targetNode.data.key
  }

  // KEY
  // Definition 3. IdentifierðIDÞ of each node is a five-tuple hs, ssv, site, offset, leni where
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
    let key = {
      session: 1,
      ssv: model.incrementVectorClock(),
      site: model.siteId,
      offset: positionWithinNode,
      length: end - start
    }
    result.push({
      type: 'delete',
      targetKey: targetKey,
      position: positionWithinNode,
      delLength: end - start,
      key: key
    })
  }

  // INSERT (targetKey, positionWithinNode, str, key)
  // insertion
  let key = {
    session: 1,
    ssv: model.incrementVectorClock(),
    site: model.siteId,
    offset: positionWithinNode,
    length: newstr.length
  }

  result.push({
    type: 'insert',
    position: positionWithinNode,
    targetKey: targetKey,
    str: newstr,
    key: key
  })

  console.log(result)
  return result
}

function getDiff (oldText, newText, cursor) {
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

textElement.addEventListener('input', function (event) {
  var diff = getDiff(oldText, textElement.value, textElement.selectionEnd)
  var ops = diffToOps(diff)
  model.applyOperations(ops) // this also broadcasts operations remotely
  console.log('local operations:' + JSON.stringify(ops))
  view.synchronize(model)
  textElement.value = view.toString()
  oldText = textElement.value
})

socket.on('model', function (modelJson, siteId) {
  console.log('model from server', modelJson)

  model = Model.fromServer(modelJson, siteId)
  model.broadcast = broadcast
  view = new View()
  view.synchronize(model)
  textElement.value = view.toString()
})

socket.on('operations', function (operations) {
  console.log('operations from server:' + JSON.stringify(operations))
  // let points = [text.selectionStart, text.selectionEnd];

  model.applyRemoteOperations(operations)
  view.synchronize(model)
  textElement.value = view.toString()
  oldText = textElement.value
  // text.selectionStart = points[0];
  // text.selectionEnd = points[1];
})
