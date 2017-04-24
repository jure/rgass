const LinkedList = require('../src/doubly-linked-list').List

describe('linked list behaviour', () => {
  it('works for numbers as data', () => {
    const doublyLinkedList = new LinkedList()

    expect(doublyLinkedList.toString()).toEqual('')

    doublyLinkedList.add(1)
    doublyLinkedList.add(2)
    doublyLinkedList.add(3)
    doublyLinkedList.add(4)

    expect(doublyLinkedList.toString()).toEqual('1 2 3 4')

    expect(doublyLinkedList.length()).toEqual(4)

    doublyLinkedList.remove(3) // remove value

    expect(doublyLinkedList.toString()).toEqual('1 2 4')

    doublyLinkedList.remove(9) // remove non existing value

    expect(doublyLinkedList.toString()).toEqual('1 2 4')

    doublyLinkedList.remove(1) // remove head
    expect(doublyLinkedList.toString()).toEqual('2 4')

    doublyLinkedList.remove(4) // remove tail
    expect(doublyLinkedList.toString()).toEqual('2')

    expect(doublyLinkedList.length()).toEqual(1)

    doublyLinkedList.remove(2) // remove tail, the list should be empty
    expect(doublyLinkedList.toString()).toEqual('')
    expect(doublyLinkedList.length()).toEqual(0)

    doublyLinkedList.add(2)
    doublyLinkedList.add(6)
    expect(doublyLinkedList.toString()).toEqual('2 6')

    doublyLinkedList.insertAfter(3, 2)
    expect(doublyLinkedList.toString()).toEqual('2 3 6')

    let reverseString = ''
    doublyLinkedList.traverseReverse(node => { reverseString += node.data })
    expect(reverseString).toEqual('632')

    doublyLinkedList.insertAfter(4, 3)
    expect(doublyLinkedList.toString()).toEqual('2 3 4 6')

    doublyLinkedList.insertAfter(5, 9) // insertAfter a non existing node
    expect(doublyLinkedList.toString()).toEqual('2 3 4 6')

    doublyLinkedList.insertAfter(5, 4)
    doublyLinkedList.insertAfter(7, 6) // insertAfter the tail
    expect(doublyLinkedList.toString()).toEqual('2 3 4 5 6 7')

    doublyLinkedList.add(8) // add node with normal method
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

    // Can add if there is no head
    doublyLinkedList.addToHead('world')
    expect(doublyLinkedList.toString()).toEqual('world')

    // Can add if there is a head
    doublyLinkedList.addToHead('hello')
    expect(doublyLinkedList.toString()).toEqual('hello world')
  })
})
