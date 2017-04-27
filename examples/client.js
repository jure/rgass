// diff adapted from https://github.com/google/ot-crdt-papers/blob/master/ot_toy.js

const Model = require('../src/rgass').Model
const View = require('../src/rgass').View
const generateOps = require('../src/generate-ops')

var textElement = document.getElementById('text')
var oldText = ''
var socket = io()
var model
var view

function broadcast (operations) {
  socket.emit('operations', operations)
}

textElement.addEventListener('input', function (event) {
  var ops = generateOps({
    oldText: oldText,
    newText: textElement.value,
    cursor: textElement.selectionEnd,
    model: model,
    view: view
  })

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
