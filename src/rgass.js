const DoublyLinkedList = require('./doubly-linked-list.js').List
const Node = require('./doubly-linked-list.js').Node

const VectorClock = require('./vector-clock')
const _ = require('lodash')

function hashKey (key) {
  return JSON.stringify(key)
}

class Model {
  constructor (options) {
    this.hashTable = options.hashTable || {}
    this.lModel = options.lModel || new DoublyLinkedList()

    this.broadcast = options.broadcast || (() => {})

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

      // TODO improve performance
      // sync hash table with doubly linked list (update .next and .previous)
      this.lModel.traverse(node => {
        this.hashTable[hashKey(node.data.key)] = node
      })
    })
  }

  findNode (targetKey, position) {
    if (!targetKey) {
      return
    }

    let targetNode = this.hashTable[hashKey(targetKey)]

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

  deleteWholeNode (targetNode) {
    targetNode.data.visible = 0
    return [targetNode.data.key]
  }

  deletePriorNode (targetNode, delLength) {
    let fNode, lNode
    [fNode, lNode] = this.splitTwoNode(targetNode, delLength)
    fNode.data.visible = 0

    this.lModel.insertBefore(fNode.data, targetNode.data)
    this.lModel.insertAfter(lNode.data, fNode.data)
    this.lModel.remove(targetNode.data)
    this.hashTable[hashKey(fNode.data.key)] = fNode
    this.hashTable[hashKey(lNode.data.key)] = lNode

    return [fNode.data.key, lNode.data.key]
  }

  deleteLastNode (targetNode, delLength) {
    let fNode, lNode
    [fNode, lNode] = this.splitTwoNode(targetNode, targetNode.data.key.length - delLength)
    lNode.data.visible = 0

    this.lModel.insertBefore(fNode.data, targetNode.data)
    this.lModel.insertAfter(lNode.data, fNode.data)
    this.lModel.remove(targetNode.data)
    this.hashTable[hashKey(fNode.data.key)] = fNode
    this.hashTable[hashKey(lNode.data.key)] = lNode

    return [fNode.data.key, lNode.data.key]
  }

  deleteMiddleNode (targetNode, position, delLength) {
    let fNode, mNode, lNode
    [fNode, mNode, lNode] = this.splitThreeNode(targetNode, position, delLength)
    mNode.data.visible = 0

    this.lModel.insertBefore(fNode.data, targetNode.data)
    this.lModel.insertAfter(mNode.data, fNode.data)
    this.lModel.insertAfter(lNode.data, mNode.data)
    this.lModel.remove(targetNode.data)
    this.hashTable[hashKey(fNode.data.key)] = fNode
    this.hashTable[hashKey(mNode.data.key)] = mNode
    this.hashTable[hashKey(lNode.data.key)] = lNode

    return [fNode.data.key, mNode.data.key, lNode.data.key]
  }

  deleteMultipleNode (targetNode, position, delLength) {
    let keyList = []

    if (delLength < (targetNode.data.key.length - position)) {
      return keyList
    }

    if (position > 1 && delLength > (targetNode.data.key.length - position)) {
      keyList = keyList.concat(this.deleteLastNode(targetNode, targetNode.data.key.length - position + 1))
      delLength = delLength - (targetNode.data.key.length - position + 1)
      targetNode = targetNode.next
    }

    if (delLength > targetNode.data.key.length) {
      while (delLength > targetNode.data.key.length) {
        keyList = keyList.concat(this.deleteWholeNode(targetNode))
        delLength = delLength - targetNode.data.key.length
        targetNode = targetNode.next
      }
    }

    if (delLength > 0) {
      keyList = keyList.concat(this.deletePriorNode(targetNode, delLength))
    }

    return keyList
  }

  localDelete (targetKey, position, delLength, key) {
    let targetNode = targetKey && this.hashTable[hashKey(targetKey)]
    let length = targetNode.data.key.length
    let keyList = []

    console.log('position', position, 'delLength', delLength, 'length', length)

    if (position === 1 && delLength === length) {
      keyList = keyList.concat(this.deleteWholeNode(targetNode))
    } else if (position === 1 && delLength < length) {
      keyList = keyList.concat(this.deletePriorNode(targetNode, delLength))
    }

    if (position > 1 && position + delLength - 1 === length) {
      keyList = keyList.concat(this.deleteLastNode(targetNode, delLength))
    }

    if (position > 1 && position + delLength - 1 < length) {
      keyList = keyList.concat(this.deleteMiddleNode(targetNode, position, delLength))
    }

    // Different than algorithm presented on page 5, we're ignoring pos > 1
    if (position + delLength - 1 > length) {
      keyList = keyList.concat(this.deleteMultipleNode(targetNode, position, delLength))
    }

    this.broadcast({type: 'delete', position: position, delLength: delLength, keyList: keyList, key: key})

    return this.lModel
  }

  localInsert (targetKey, position, str, key) {
    let newNode = new Node({key: key, str: str, visible: 1})

    let targetNode = targetKey && this.hashTable[hashKey(targetKey)]
    console.log('Found targetNode', targetNode)

    if (!targetNode && position === 0) {
      this.lModel.addToHead(newNode.data)
    } else {
      if (position === targetNode.data.key.length) {
        this.lModel.insertAfter(newNode.data, targetNode.data)
      } else {
        let fNode, lNode
        [fNode, lNode] = this.splitTwoNode(targetNode, position)
        this.lModel.insertBefore(fNode.data, targetNode.data)
        this.lModel.insertAfter(newNode.data, fNode.data)
        this.lModel.insertAfter(lNode.data, newNode.data)
        this.lModel.remove(targetNode.data)
        this.hashTable[hashKey(fNode.data.key)] = fNode
        this.hashTable[hashKey(lNode.data.key)] = lNode
      }
    }

    this.hashTable[hashKey(key)] = newNode

    console.log('debug', this.lModel)
    this.broadcast([{type: 'insert', position: position, targetKey: targetKey, str: str, key: key}])

    return this.lModel
  }

  splitTwoNode (targetNode, position) {
    let fNode = _.cloneDeep(targetNode)
    fNode.data.key.offset = targetNode.data.key.offset
    fNode.data.key.length = position
    fNode.data.str = targetNode.data.str.substr(0, position)
    console.log('created fNode', fNode)

    let lNode = _.cloneDeep(targetNode)
    lNode.data.key.offset = targetNode.data.key.offset + position
    lNode.data.key.length = targetNode.data.key.length - position
    lNode.data.str = targetNode.data.str.substr(position, targetNode.data.key.length - fNode.data.key.length)
    console.log('created lNode', lNode)

    targetNode.data.flag = 1
    targetNode.data.list = [fNode, lNode]
    return [fNode, lNode]
  }

  splitThreeNode (targetNode, position, delLength) {
    let fNode = _.cloneDeep(targetNode)
    fNode.data.key.offset = targetNode.data.key.offset
    fNode.data.key.length = position - 1
    fNode.data.str = targetNode.data.str.substr(0, fNode.data.key.length)
    console.log('created fNode', fNode)

    let mNode = _.cloneDeep(targetNode)
    mNode.data.key.offset = targetNode.data.key.offset + position - 1
    mNode.data.key.length = delLength
    mNode.data.str = targetNode.data.str.substr(fNode.data.key.length, mNode.data.key.length)
    console.log('created mNode', mNode)

    let lNode = _.cloneDeep(targetNode)
    lNode.data.key.offset = mNode.data.key.offset + delLength
    lNode.data.key.length = targetNode.data.key.length - fNode.data.key.length - mNode.data.key.length
    lNode.data.str = targetNode.data.str.substr(fNode.data.key.length + mNode.data.key.length, lNode.data.key.length)
    console.log('created lNode', lNode)

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

    if (targetNode) {
      if (position === targetNode.data.key.length) {
        while (targetNode && (key === this.predecessorId(key, targetNode.data.key))) {
          targetNode = targetNode.next
        }
        this.lModel.insertAfter(newNode.data, targetNode.data)
      } else {
        let fNode, lNode
        [fNode, lNode] = this.splitTwoNode(targetNode, position)
        this.lModel.insertBefore(fNode.data, targetNode.data)
        this.lModel.insertAfter(newNode.data, fNode.data)
        this.lModel.insertAfter(lNode.data, newNode.data)
        this.lModel.remove(targetNode.data)
        this.hashTable[hashKey(fNode.data.key)] = fNode
        this.hashTable[hashKey(lNode.data.key)] = lNode
      }
    } else {
      let previous
      let current = this.lModel.head

      while (current) {
        if (key === this.predecessorId(key, current.data.key)) {
          previous = current
          current = current.next
        } else {
          current = undefined
        }
      }

      if (previous) {
        this.lModel.insertAfter(newNode.data, previous.data)
      } else {
        this.lModel.addToHead(newNode.data)
      }
    }

    this.hashTable[hashKey(newNode.data.key)] = newNode
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
      if (currentPosition < position) {
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
