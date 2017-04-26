const LinkedList = require('../src/doubly-linked-list').List
const Node = require('../src/doubly-linked-list').Node

describe('linked list behaviour', () => {
  it('works for numbers as data', () => {
    const doublyLinkedList = new LinkedList()

    expect(doublyLinkedList.toString()).toEqual('')

    let node1 = new Node(1)
    let node2 = new Node(2)
    let node3 = new Node(3)
    let node4 = new Node(4)
    doublyLinkedList.add(node1)
    doublyLinkedList.add(node2)
    doublyLinkedList.add(node3)
    doublyLinkedList.add(node4)

    expect(doublyLinkedList.toString()).toEqual('1 2 3 4')

    expect(doublyLinkedList.length()).toEqual(4)

    doublyLinkedList.remove(node3) // remove value

    expect(doublyLinkedList.toString()).toEqual('1 2 4')

    doublyLinkedList.remove(new Node(9)) // remove non existing value

    expect(doublyLinkedList.toString()).toEqual('1 2 4')

    doublyLinkedList.remove(node1) // remove head
    expect(doublyLinkedList.toString()).toEqual('2 4')

    doublyLinkedList.remove(node4) // remove tail
    expect(doublyLinkedList.toString()).toEqual('2')

    expect(doublyLinkedList.length()).toEqual(1)

    doublyLinkedList.remove(node2) // remove tail, the list should be empty
    expect(doublyLinkedList.toString()).toEqual('')
    expect(doublyLinkedList.length()).toEqual(0)

    doublyLinkedList.add(node2)

    let node6 = new Node(6)

    doublyLinkedList.add(node6)

    expect(doublyLinkedList.toString()).toEqual('2 6')

    doublyLinkedList.insertAfter(node3, node2)
    expect(doublyLinkedList.toString()).toEqual('2 3 6')

    let reverseString = ''
    doublyLinkedList.traverseReverse(node => { reverseString += node.data })
    expect(reverseString).toEqual('632')

    doublyLinkedList.insertAfter(node4, node3)
    expect(doublyLinkedList.toString()).toEqual('2 3 4 6')

    let node5 = new Node(5)

    doublyLinkedList.insertAfter(node5, new Node(9)) // insertAfter a non existing node
    expect(doublyLinkedList.toString()).toEqual('2 3 4 6')

    doublyLinkedList.insertAfter(node5, node4)

    let node7 = new Node(7)

    doublyLinkedList.insertAfter(node7, node6) // insertAfter the tail
    expect(doublyLinkedList.toString()).toEqual('2 3 4 5 6 7')

    let node8 = new Node(8)
    doublyLinkedList.add(node8) // add node with normal method
    expect(doublyLinkedList.toString()).toEqual('2 3 4 5 6 7 8')

    expect(doublyLinkedList.length()).toEqual(7)

    doublyLinkedList.traverse(node => { node.data = node.data + 10 })
    expect(doublyLinkedList.toString()).toEqual('12 13 14 15 16 17 18')

    let traverseString = ''
    doublyLinkedList.traverse(node => { traverseString += node.data })
    expect(traverseString).toEqual('12131415161718')

    expect(doublyLinkedList.length()).toEqual(7)

    reverseString = ''
    doublyLinkedList.traverseReverse(node => { reverseString += node.data })
    expect(reverseString).toEqual('18171615141312')

    expect(doublyLinkedList.toString()).toEqual('12 13 14 15 16 17 18')
    expect(doublyLinkedList.length()).toEqual(7)

    expect(doublyLinkedList.length()).toEqual(7)
  })

  it('can add to head', () => {
    const doublyLinkedList = new LinkedList()
    let worldNode = new Node('world')

    // Can add if there is no head
    doublyLinkedList.addToHead(worldNode)
    expect(doublyLinkedList.toString()).toEqual('world')

    let helloNode = new Node('hello')

    // Can add if there is a head
    doublyLinkedList.addToHead(helloNode)
    expect(doublyLinkedList.toString()).toEqual('hello world')

    expect(helloNode.next).toEqual(worldNode)
  })
})
