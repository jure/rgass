// diff adapted from https://github.com/google/ot-crdt-papers/blob/master/ot_toy.js

const Model = require('../src/rgass').Model
const View = require('../src/rgass').View
const generateOps = require('../src/generate-ops')

var socket1 = io()
// var socket2 = io()

function setup (textElement, socket) {
  let model
  let view
  let oldText = ''
  let transmitStatus = document.getElementById('transmitStatus')
  let receiveStatus = document.getElementById('receiveStatus')

  let waitingToTransmitOps = []
  let waitingToProccessOps = []
  let networkPartitionStatus = false

  let proccessOperations = (operations) => {
    console.log('operations from server:' + JSON.stringify(operations))
    // let points = [text.selectionStart, text.selectionEnd];

    model.applyRemoteOperations(operations)
    view.synchronize(model)
    textElement.value = view.toString()
    oldText = textElement.value
    // text.selectionStart = points[0];
    // text.selectionEnd = points[1];
  }

  // Toggles receiving and transmitting operations, simulating a
  // network partition

  let networkPartition = () => {
    if (!networkPartitionStatus) {
      networkPartitionStatus = true
      transmitStatus.innerHTML = 'Network partition in effect, waiting to transmit'
      receiveStatus.innerHTML = 'Network partition in effect, waiting to receive'
      if (waitingToTransmitOps.length === 0) {
        socket.removeAllListeners('operations')

        socket.on('operations', (ops) => {
          console.log('waiting to process ops', waitingToProccessOps.length)
          waitingToProccessOps = waitingToProccessOps.concat(ops)
          receiveStatus.innerHTML = 'Network partition in effect, waiting to receive ops: ' + waitingToProccessOps.length
        })

        model.broadcast = (ops) => {
          console.log('waiting to transmit ops', waitingToTransmitOps.length)
          waitingToTransmitOps = waitingToTransmitOps.concat(ops)
          transmitStatus.innerHTML = 'Network partition in effect, waiting to transmit ops: ' + waitingToTransmitOps.length
        }
      }
      networkPartition = true
    } else {
      proccessOperations(waitingToProccessOps)
      waitingToProccessOps = []
      socket.removeAllListeners('operations')
      socket.on('operations', proccessOperations)
      receiveStatus.innerHTML = 'Network receiving normally'

      broadcast(socket)(waitingToTransmitOps)
      waitingToTransmitOps = []
      transmitStatus.innerHTML = 'Network transmitting normally'

      model.broadcast = broadcast(socket)
      networkPartitionStatus = false
    }
  }

  let update = () => {
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

    console.log(model.siteId, model.lModel.nodes())
  }

  textElement.addEventListener('input', event => update())

  socket.on('model', function (modelJson, siteId) {
    console.log('model from server', modelJson)

    model = Model.fromServer(modelJson, siteId)
    model.broadcast = broadcast(socket)
    view = new View()
    view.synchronize(model)
    textElement.value = view.toString()
  })

  socket.on('operations', proccessOperations)

  return [update, networkPartition]
}

function broadcast (socket) {
  return (operations) => socket.emit('operations', operations)
}

let text1 = document.getElementById('text1')
// let text2 = document.getElementById('text2')

let update1
let networkPartition1
[update1, networkPartition1] = setup(text1, socket1)
// let update2 = setup(text2, socket2)

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
    if (Math.random() >= 0.5 || textElement.value === '') {
      textElement.value = currentText + Math.random().toString(36).substr(2, randomLength)
    } else {
      let randomPosition = Math.floor(Math.random() * currentText.length)
      textElement.value = currentText.substring(0, randomPosition) + currentText.substring(randomPosition + randomLength)
      textElement.selectionEnd = randomPosition
    }
    update()
  }
}

let interval1, interval2

function nextIteration () {
  setTimeout(changeText(text1, update1)) // , Math.random() * 1000)
  // setTimeout(changeText(text2, update2)) //, Math.random() * 1000)
}

function checkTextEquality () {
  // if (text1.value === text2.value) {
    // backgroundColor('#228B22')
  // } else {
    // backgroundColor('#B22222')
  // }
}

startButton.addEventListener('click', event => {
  if (!interval1 && !interval2) {
    interval1 = window.setInterval(nextIteration, 1000)
    // interval2 = window.setInterval(checkTextEquality, 50)
    backgroundColor()
  }
})

let nextButton = document.getElementById('next')

nextButton.addEventListener('click', event => {
  if (!interval1 && !interval2) {
    nextIteration()
  }
})

let stopButton = document.getElementById('stop')

stopButton.addEventListener('click', event => {
  interval1 = clearInterval(interval1)
  // interval2 = clearInterval(interval2)
})

let networkPartitionButton = document.getElementById('network')

networkPartitionButton.addEventListener('click', event => {
  networkPartition1()
})
