const DoublyLinkedList = require('./src/doubly-linked-list.js').List
const Node = require('./src/doubly-linked-list.js').Node

const VectorClock = require('./src/vector-clock')
const _ = require('lodash')

class Model {
  constructor (options) {
    this.hashTable = options.hashTable || {}
    this.lModel = options.lModel || new DoublyLinkedList()

    this.broadcast = options.broadcast

    if (!options.siteId) {
      throw Error('missing siteId')
    }
    this.siteId = options.siteId
    this.session = options.session
    this.vectorClock = new VectorClock()
  }

  toJSON () {
    return JSON.stringify({
      hashTable: this.hashTable,
      lModel: this.lModel.nodes()
    })
  }

  static fromServer (modelJson, siteId) {
    let model = JSON.parse(modelJson)
    return new this({
      siteId: siteId,
      session: 1, // TODO
      lModel: DoublyLinkedList.fromNodes(model.lModel),
      hashTable: model.hashTable
    })
  }

  incrementVectorClock (siteId) {
    if (siteId) {
      this.vectorClock.increment(siteId)
    } else {
      this.vectorClock.increment(this.siteId)
    }
    return this.vectorClock.sum()
  }

  applyOperations (operations) {
    operations.forEach(operation => {
      console.log('Applying local operation', operation)
      if (operation.type === 'insert') {
        this.localInsert(operation.targetKey, operation.position, operation.str, operation.key)
      } else {
        this.localDelete(operation.targetKey, operation.position, operation.delLength, operation.key)
      }
    })
  }

  findNode (targetKey, position) {
    if (!targetKey) {
      return
    }

    let targetNode = this.hashTable[targetKey]

    while (targetNode.data.flag === 1) {
      if (position <= targetNode.data.list[0].data.key.length) {
        targetNode = targetNode.data.list[0]
      } else if (position <= targetNode.data.list[1].data.key.offset + targetNode.data.list[1].data.key.length) {
        targetNode = targetNode.data.list[1]
      } else {
        targetNode = targetNode.data.list[2]
      }
    }

    return targetNode
  }

  localDelete (targetKey, position, delLength, key) {
    // noop
  }

  localInsert (targetKey, position, str, key) {
    let newNode = new Node({key: key, str: str, visible: 1})

    // Is this the first node that this client is aware of?
    if (!targetKey) {
      this.lModel.add(newNode.data)
    } else {
      let targetNode = this.hashTable[targetKey]
      console.log('Found targetNode', targetNode)
      if ((targetNode === this.lModel.head) && position === 0) {
        this.lModel.insertBefore(newNode.data, targetNode.data)
      } else {
        if (position === targetNode.data.key.length) {
          this.lModel.insertAfter(newNode.data, targetNode.data)
        } else {
          let fNode, lNode
          [fNode, lNode] = this.splitTwoNode(targetNode, position)
          this.lModel.insertBefore(targetNode, fNode)
          this.lModel.insertAfter(newNode, fNode)
          this.lModel.insertAfter(lNode, newNode)
          this.hashTable[fNode.data.key] = fNode
          this.hashTable[lNode.data.key] = lNode
        }
      }
    }

    this.hashTable[key] = newNode

    console.log('debug', this.lModel)
    this.broadcast([{type: 'insert', position: position, targetKey: targetKey, str: str, key: key}])

    return this.lModel
  }

  splitTwoNode (targetNode, position) {
    let fNode = _.cloneDeep(targetNode)
    fNode.data.key.offset = targetNode.data.key.offset
    fNode.data.key.length = position
    fNode.data.str = targetNode.data.str.substr(0, position)

    let lNode = _.cloneDeep(targetNode)
    lNode.data.key.offset = targetNode.data.key.offset + position
    lNode.data.str = targetNode.data.str.substr(position, targetNode.data.key.length - fNode.data.key.length)
    targetNode.flag = 1
    targetNode.list = [fNode, lNode]
    return [fNode, lNode]
  }

  splitThreeNode (targetNode, position, delLength) {
    let fNode = _.cloneDeep(targetNode)
    fNode.data.key.offset = targetNode.data.key.offset
    fNode.data.key.length = position - 1
    fNode.data.str = targetNode.data.str.substr(0, fNode.data.key.length)

    let mNode = _.cloneDeep(targetNode)
    mNode.data.key.offset = targetNode.data.key.offset + position - 1
    mNode.data.key.length = delLength
    mNode.data.str = targetNode.data.str.substr(fNode.data.key.length, mNode.data.key.length)

    let lNode = _.cloneDeep(targetNode)
    lNode.data.key.offset = mNode.data.key.offset + delLength
    lNode.data.key.length = targetNode.data.key.length - fNode.data.key.length - mNode.data.key.length
    lNode.data.str = targetNode.data.str.substr(fNode.data.key.length + mNode.data.key.length, lNode.data.key.length)
    targetNode.data.flag = 1
    targetNode.data.list = [fNode, mNode, lNode]
    return [fNode, mNode, lNode]
  }

  // Which id is predecessor, based on definition 4 on page 11
  predecessorId (id1, id2) {
    if (id1.session < id2.session) {
      return id1
    } else if (id1.session === id2.session) {
      if (id1.ssv < id2.ssv) {
        return id1
      } else if (id1.ssv === id2.ssv) {
        if (id1.site < id2.site) {
          return id1
        } else if (id1.site === id2.site) {
          if (id1.offset < id2.offset) {
            return id1
          } else {
            return id2
          }
        } else {
          return id2
        }
      } else {
        return id2
      }
    } else {
      return id2
    }
  }

  // Based on definition 5, page 11
  predeccesorNode (node1, node2) {
    if (this.predecessorId(node1.data.key, node2.key) === node1.data.key) {
      return node2
    } else {
      return node1
    }
  }

  applyRemoteOperations (operations) {
    operations.forEach(operation => {
      console.log('Applying remote operation', operation)
      if (operation.type === 'insert') {
        this.remoteInsert(operation.targetKey, operation.position, operation.str, operation.key)
      } else {
        this.remoteDelete(operation.targetKey, operation.position, operation.delLength, operation.key)
      }
    })
  }

  remoteDelete (position, delLength, keyList, key) {
    // noop
  }

  remoteInsert (targetKey, position, str, key) {
    let newNode = new Node({key: key, str: str, visible: 1})
    let targetNode = this.findNode(targetKey, position)

    // if (!targetKey) {
    //   this.lModel.add(newNode.data)
    // } else {

    if (targetNode) {
      if (position === targetNode.data.key.length) {
        while (targetNode && (key === this.predecessorId(key, targetNode.data.key))) {
          targetNode = targetNode.next
        }
        this.lModel.insertAfter(newNode.data, targetNode.data)
      } else {
        let fNode, lNode
        [fNode, lNode] = this.splitTwoNode(targetNode, position)
        this.lModel.insertBefore(targetNode.data, fNode.data)
        this.lModel.insertAfter(newNode.data, fNode.data)
        this.lModel.insertAfter(lNode.data, newNode.data)
        this.hashTable[fNode.data.key] = fNode
        this.hashTable[lNode.data.key] = lNode
      }
    } else {
      let previous = this.lModel.head
      let current = this.lModel.head.next
      while (current) {
        if (key === this.predecessorId(key, current.data.key)) {
          previous = current
          current = current.next
        }
      }
      if (previous) {
        this.lModel.insertAfter(newNode.data, previous.data)
      } else {
        this.lModel.add(newNode.data)
      }
    }

    this.hashTable[newNode.data.key] = newNode
    return this.lModel
  }
}

class View {
  constructor () {
    this.lView = new DoublyLinkedList()
  }

  nodeAtPosition (position) {
    var currentPosition = 0
    var currentNode
    var positionWithinNode = 0
    this.lView.traverse(node => {
      if (currentPosition <= position) {
        positionWithinNode = position - currentPosition
        currentPosition = currentPosition + node.data.key.length
        currentNode = node
      }
    })
    return [currentNode, positionWithinNode]
  }

  toString () {
    var string = ''
    this.lView.traverse(node => {
      string = string + node.data.str
    })
    return string
  }

  synchronize (model) {
    this.lView = new DoublyLinkedList()
    let node = model.lModel.head
    while (node) {
      if (node.data.visible) {
        this.lView.add(node.data)
      }
      node = node.next
    }
    return this.lView
  }
}

module.exports = {
  Model: Model,
  View: View
}
