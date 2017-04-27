// diff adapted from https://github.com/google/ot-crdt-papers/blob/master/ot_toy.js

const Model = require('../src/rgass').Model
const View = require('../src/rgass').View
const generateOps = require('../src/generate-ops')

var socket1 = io()
var socket2 = io()

function setup (textElement, socket) {
  var model
  var view
  var oldText = ''

  socket.on('model', function (modelJson, siteId) {
    console.log('model from server', modelJson)

    model = Model.fromServer(modelJson, siteId)
    model.broadcast = broadcast(socket)
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

  return () => {
    var ops = generateOps({
      oldText: oldText,
      newText: textElement.value,
      cursor: textElement.selectionEnd,
      model: model,
      view: view
    })

    model.applyOperations(ops) // this also broadcasts operations remotely
    console.log('local operations', model.siteId, JSON.stringify(ops))
    view.synchronize(model)
    textElement.value = view.toString()
    oldText = textElement.value
  }
}

function broadcast (socket) {
  return (operations) => socket.emit('operations', operations)
}

let text1 = document.getElementById('text1')
let text2 = document.getElementById('text2')

let update1 = setup(text1, socket1)
let update2 = setup(text2, socket2)

let startButton = document.getElementById('start')

function backgroundColor (color) {
  if (color) {
    document.body.style.background = color
  } else {
    document.body.style.background = undefined
  }
}

function changeText (textElement, update) {
  return () => {
    let randomLength = Math.ceil(Math.random() * 11)
    let currentText = textElement.value
    if (Math.random() >= 0.5) {
      textElement.value = currentText + Math.random().toString(36).substr(2, randomLength)
    } else {
      let randomPosition = Math.floor(Math.random() * currentText.length)
      textElement.value = currentText.substring(0, randomPosition) + currentText.substring(randomPosition + randomLength)
    }
    update()
  }
}

let interval1
let interval2

startButton.addEventListener('click', function (event) {
  if (!interval1 && !interval2) {
    interval1 = window.setInterval(changeText(text1, update1), 1000)
    interval2 = window.setInterval(changeText(text2, update2), 1111)
    backgroundColor()
  }
})

let stopButton = document.getElementById('stop')

stopButton.addEventListener('click', function (event) {
  clearInterval(interval1)
  clearInterval(interval2)
  if (text1.value === text2.value) {
    backgroundColor('#228B22')
  } else {
    backgroundColor('#B22222')
  }
})
