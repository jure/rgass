var express = require('express')
var app = express()
var http = require('http').Server(app)
var io = require('socket.io')(http)
var rgass = require('./src/rgass')
// var sleep = require('sleep')

var options = {root: __dirname}

app.get('/', function (req, res) {
  res.sendFile('index.html', options)
})

app.get('/bundle.js', function (req, res) {
  res.sendFile('bundle.js', options)
})

var session = 1 // keep at 1 for now
var siteId = 1 // increase for every client

var model = new rgass.Model({
  siteId: siteId,
  session: session,
  broadcast: broadcast.bind(io)
})

function broadcast (operations) {
  console.log('broadcasting operations', operations)
  this.emit('operations', operations)
}

io.on('connection', function (socket) {
  console.log('client connected')

  socket.on('operations', function (operations) {
    broadcast.bind(socket.broadcast)(operations)
  })
  socket.emit('model', model.toJSON(), siteId++)
})

http.listen(3000, function () {
  console.log('Connect your client to http://localhost:3000/')
})
