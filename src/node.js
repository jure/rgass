// class Node {
//   key {
//     s // global increasing number
//     ssv // sum of state vector (SV) of an operation
//     site // unique identifier of the site
//     offset // lenght from the leftmost position of the current Node
//           // to the leftmost position of the original Node

//     len // lenght of the string in current Node
//   }
//   flag // boolean
//   visible // boolean
//   content // string
//   prior // linking nodes in Lmodel
//   next // linking nodes in Lmodel
//   link
//   list
// }

class Node {
  constructor (data) {
    this.data = data

    this.previous = null
    this.next = null
  }
}

module.exports = Node
