const DoublyLinkedList = require('./doubly-linked-list.js').List
const Node = require('./doubly-linked-list.js').Node

const VectorClock = require('./vector-clock')
const _ = require('lodash')

const log = require('./logger')

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
      log('Applying local operation', operation)
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
    return [{
      key: targetNode.data.key,
      position: 1,
      delLength: targetNode.data.key.length
    }]
  }

  deletePriorNode (targetNode, delLength) {
    let fNode, lNode
    [fNode, lNode] = this.splitTwoNode(targetNode, delLength)
    fNode.data.visible = 0

    this.lModel.insertBefore(fNode, targetNode)
    this.lModel.insertAfter(lNode, fNode)
    this.lModel.remove(targetNode)
    this.hashTable[hashKey(fNode.data.key)] = fNode
    this.hashTable[hashKey(lNode.data.key)] = lNode

    return [{
      key: targetNode.data.key,
      position: 1,
      delLength: delLength
    }]
  }

  deleteLastNode (targetNode, delLength) {
    let fNode, lNode
    [fNode, lNode] = this.splitTwoNode(targetNode, targetNode.data.key.length - delLength)
    lNode.data.visible = 0

    this.lModel.insertBefore(fNode, targetNode)
    this.lModel.insertAfter(lNode, fNode)
    this.lModel.remove(targetNode)
    this.hashTable[hashKey(fNode.data.key)] = fNode
    this.hashTable[hashKey(lNode.data.key)] = lNode

    return [{
      key: targetNode.data.key,
      position: targetNode.data.key.length - delLength + 1,
      delLength: delLength
    }]
  }

  deleteMiddleNode (targetNode, position, delLength) {
    let fNode, mNode, lNode
    [fNode, mNode, lNode] = this.splitThreeNode(targetNode, position, delLength)
    mNode.data.visible = 0

    this.lModel.insertBefore(fNode, targetNode)
    this.lModel.insertAfter(mNode, fNode)
    this.lModel.insertAfter(lNode, mNode)
    this.lModel.remove(targetNode)
    this.hashTable[hashKey(fNode.data.key)] = fNode
    this.hashTable[hashKey(mNode.data.key)] = mNode
    this.hashTable[hashKey(lNode.data.key)] = lNode

    return [{
      key: targetNode.data.key,
      position: position,
      delLength: delLength
    }]
  }

  deleteMultipleNode (targetNode, position, delLength) {
    log(targetNode)
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
      while (targetNode && delLength >= targetNode.data.key.length) {
        if (targetNode.data.visible) {
          log('deleting', targetNode.data.str, 'because delLength', delLength, '>', targetNode.data.key.length)
          keyList = keyList.concat(this.deleteWholeNode(targetNode))
          delLength = delLength - targetNode.data.key.length
        } else {
          log('targetNode', targetNode.data.str, 'is invisible already, skipping')
        }
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
    // only tombstones! algorithm 6 on page 5 is different
    // in this regards, adds all created subnodes to keyList
    let keyList = []

    log('position', position, 'delLength', delLength, 'length', length)

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

    this.broadcast([{type: 'delete', position: position, delLength: delLength, keyList: keyList, key: key}])

    return this.lModel
  }

  localInsert (targetKey, position, str, key) {
    let newNode = new Node({key: key, str: str, visible: 1})

    let targetNode = targetKey && this.hashTable[hashKey(targetKey)]
    log('Found targetNode', targetNode)

    if (!targetNode && position === 0) {
      this.lModel.addToHead(newNode)
    } else {
      if (position === targetNode.data.key.length) {
        this.lModel.insertAfter(newNode, targetNode)
      } else {
        let fNode, lNode
        [fNode, lNode] = this.splitTwoNode(targetNode, position)
        this.lModel.insertBefore(fNode, targetNode)
        this.lModel.insertAfter(newNode, fNode)
        this.lModel.insertAfter(lNode, newNode)
        this.lModel.remove(targetNode)
        this.hashTable[hashKey(fNode.data.key)] = fNode
        this.hashTable[hashKey(lNode.data.key)] = lNode
      }
    }

    this.hashTable[hashKey(key)] = newNode

    this.broadcast([{type: 'insert', position: position, targetKey: targetKey, str: str, key: key}])

    return this.lModel
  }

  splitTwoNode (targetNode, position) {
    let fNode = _.cloneDeep(targetNode)
    fNode.data.key.offset = targetNode.data.key.offset
    fNode.data.key.length = position
    fNode.data.str = targetNode.data.str.substr(0, position)
    log('created fNode', fNode)

    let lNode = _.cloneDeep(targetNode)
    lNode.data.key.offset = targetNode.data.key.offset + position
    lNode.data.key.length = targetNode.data.key.length - position
    lNode.data.str = targetNode.data.str.substr(position, targetNode.data.key.length - fNode.data.key.length)
    log('created lNode', lNode)

    targetNode.data.flag = 1
    targetNode.data.list = [fNode, lNode]
    return [fNode, lNode]
  }

  splitThreeNode (targetNode, position, delLength) {
    let fNode = _.cloneDeep(targetNode)
    fNode.data.key.offset = targetNode.data.key.offset
    fNode.data.key.length = position - 1
    fNode.data.str = targetNode.data.str.substr(0, fNode.data.key.length)
    log('created fNode', fNode)

    let mNode = _.cloneDeep(targetNode)
    mNode.data.key.offset = targetNode.data.key.offset + position - 1
    mNode.data.key.length = delLength
    mNode.data.str = targetNode.data.str.substr(fNode.data.key.length, mNode.data.key.length)
    log('created mNode', mNode)

    let lNode = _.cloneDeep(targetNode)
    lNode.data.key.offset = mNode.data.key.offset + delLength
    lNode.data.key.length = targetNode.data.key.length - fNode.data.key.length - mNode.data.key.length
    lNode.data.str = targetNode.data.str.substr(fNode.data.key.length + mNode.data.key.length, lNode.data.key.length)
    log('created lNode', lNode)

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
          if (id1.offset > id2.offset) {
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
  predecessorNode (node1, node2) {
    if (this.predecessorId(node1.data.key, node2.key) === node1.data.key) {
      return node2
    } else {
      return node1
    }
  }

  applyRemoteOperations (operations) {
    operations.forEach(operation => {
      log('Applying remote operation', operation)
      this.incrementVectorClock(operation.key.site)
      if (operation.type === 'insert') {
        this.remoteInsert(operation.targetKey,
          operation.position,
          operation.str,
          operation.key
        )
      } else {
        this.remoteDelete(
          operation.position,
          operation.delLength,
          operation.keyList,
          operation.key
        )
      }
    })
  }

  remoteDelete (position, delLength, keyList, key) {
    let count = keyList.length
    let targetNode = keyList[0].key && this.hashTable[hashKey(keyList[0].key)]

    if (count === 1) {
      this.del(position, delLength, targetNode)
    } else {
      let sumLength = targetNode.data.key.length - keyList[0].position + 1

      this.del(keyList[0].position, keyList[0].delLength, targetNode)

      let p = 1

      for (let i = 1; i < count - 1; i++) {
        let tempnode = this.hashTable[hashKey(keyList[i].key)]
        this.del(p, keyList[i].key.length, tempnode)
        sumLength += keyList[i].key.length
      }

      let lastLength = delLength - sumLength

      let lastNode = this.hashTable[hashKey(keyList[count - 1].key)]

      this.del(p, lastLength, lastNode)
    }
    return this.lModel
  }

  del (position, delLength, targetNode) {
    let l = targetNode.data.key.length

    log('del', position, delLength, targetNode)

    if (!targetNode.flag) {
      if (position === 1 && delLength === l) {
        this.deleteWholeNode(targetNode)
      } else if (position === 1 && delLength < l) {
        this.deletePriorNode(targetNode, delLength)
      } else if (position > 1 && position + delLength - 1 === l) {
        this.deleteLastNode(targetNode, delLength)
      } else {
        this.deleteMiddleNode(targetNode, position, delLength)
      }
    } else {
      log('targetNode', targetNode.data)
      let sub1 = targetNode.data.list[0]
      let sub2 = targetNode.data.list[1]
      let sub3 = targetNode.data.list[2]

      let l1 = sub1.data.key.length
      let l2 = sub2.data.key.length

      if (position <= l1 && position + delLength <= l1) {
        this.del(position, delLength, sub1)
      } else if (position <= l1 && delLength - (l1 - position + 1) <= l2) {
        this.del(position, l1 + position + 1, sub1)
        this.del(1, delLength - (l1 - position + 1), sub2)
      } else if (position <= l1 && delLength - (l1 - position + 1) >= l2) {
        let p = l1 - position + 1
        this.del(position, p, sub1)
        this.del(1, l2, sub2)
        this.del(1, delLength - p - l2, sub3)
      } else if (position > l1 && position - l1 <= l2 && position - l1 + delLength - 1 <= l2) {
        let p = position - l1
        this.del(p, delLength, sub2)
      } else if (position > l1 && position - l1 <= l2 && position - l1 + delLength - 1 >= l2) {
        let p = position - l1
        this.del(p, l2 - p + 1, sub2)
        this.del(1, delLength - (l2 - p + 1), sub3)
      } else {
        let q = position - l1 - l2
        this.del(q, delLength, sub3)
      }
    }
  }

  remoteInsert (targetKey, position, str, key) {
    let newNode = new Node({key: key, str: str, visible: 1})
    let targetNode = this.findNode(targetKey, position)

    if (targetNode) {
      if (position === targetNode.data.key.length) {
        let previous
        let current = targetNode.next

        while (current) {
          if (key === this.predecessorId(key, current.data.key)) {
            previous = current
            current = current.next
          } else {
            current = undefined
          }
        }

        if (previous) {
          this.lModel.insertAfter(newNode, previous)
        } else {
          this.lModel.insertAfter(newNode, targetNode)
        }
      } else {
        let fNode, lNode
        [fNode, lNode] = this.splitTwoNode(targetNode, position)
        this.lModel.insertBefore(fNode, targetNode)
        this.lModel.insertAfter(newNode, fNode)
        this.lModel.insertAfter(lNode, newNode)
        this.lModel.remove(targetNode)
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
        this.lModel.insertAfter(newNode, previous)
      } else {
        this.lModel.addToHead(newNode)
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
        this.lView.add(new Node(node.data))
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
