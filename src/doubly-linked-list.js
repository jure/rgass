// Adapted from github.com/benoitvallon/computer-science-in-javascript/blob/master/data-structures-in-javascript
// Added support for object based data
// Added serialization support to and from JSON

const _ = require('lodash')
const Node = require('./node')

class DoublyLinkedList {
  constructor () {
    this.head = null
    this.tail = null
    this.numberOfValues = 0
  }

  add (data) {
    const node = new Node(data)
    if (!this.head) {
      this.head = node
      this.tail = node
    } else {
      node.previous = this.tail
      this.tail.next = node
      this.tail = node
    }
    this.numberOfValues++
    return node
  }

  addToHead (data) {
    if (!this.head) {
      this.add(data)
    } else {
      this.insertBefore(data, this.head.data)
    }
  }

  remove (data) {
    let current = this.head
    while (current) {
      if (_.isEqual(current.data, data)) {
        if (current === this.head && current === this.tail) {
          this.head = null
          this.tail = null
        } else if (current === this.head) {
          this.head = this.head.next
          this.head.previous = null
        } else if (current === this.tail) {
          this.tail = this.tail.previous
          this.tail.next = null
        } else {
          current.previous.next = current.next
          current.next.previous = current.previous
        }
        this.numberOfValues--
      }
      current = current.next
    }
  }

  insertAfter (data, toNodeData) {
    let current = this.head
    while (current) {
      if (_.isEqual(current.data, toNodeData)) {
        let node = new Node(data)
        if (current === this.tail) {
          this.add(data)
        } else {
          current.next.previous = node
          node.previous = current
          node.next = current.next
          current.next = node
          this.numberOfValues++
        }
      }
      current = current.next
    }
  }

  insertBefore (data, toNodeData) {
    let current = this.head
    while (current) {
      if (_.isEqual(current.data, toNodeData)) {
        if (current === this.head) {
          const node = new Node(data)
          current.previous = node
          this.head = node
          node.next = current
        } else {
          this.insertAfter(data, current.previous.data)
        }
      }
      current = current.next
    }
  }

  traverse (fn) {
    let current = this.head
    while (current) {
      if (fn) {
        fn(current)
      }
      current = current.next
    }
  }

  traverseReverse (fn) {
    let current = this.tail
    while (current) {
      if (fn) {
        fn(current)
      }
      current = current.previous
    }
  }

  length () {
    return this.numberOfValues
  }

  toString () {
    let string = ''
    let current = this.head
    while (current) {
      string += `${current.data} `
      current = current.next
    }
    return string.trim()
  }

  print () {
    console.log(this.toString())
  }

  nodes () {
    let nodes = []
    let current = this.head
    while (current) {
      nodes.push(current)
      current = current.next
    }
    return nodes
  }

  toJSON () {
    return JSON.stringify(this.nodes())
  }

  static fromNodes (nodes) {
    let doublyLinkedList = new this()
    nodes.forEach((node) => {
      doublyLinkedList.add(node)
    })
    return doublyLinkedList
  }

  static fromJSON (json) {
    let nodes = JSON.parse(json)
    return this.fromNodes(nodes)
  }
}

module.exports = {
  List: DoublyLinkedList,
  Node: Node
}
