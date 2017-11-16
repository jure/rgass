🚨⚠️ No longer in development, for similar use cases (and using the same basic approach) take a look at https://github.com/atom/teletype-crdt. It also passes the edge-case described in the TODO section. ⚠️🚨

# Rgass.js

[![build status](https://gitlab.coko.foundation/jure/rgass/badges/master/build.svg)](https://gitlab.coko.foundation/jure/rgass/commits/master)
[![coverage report](https://gitlab.coko.foundation/jure/rgass/badges/master/coverage.svg)](https://gitlab.coko.foundation/jure/rgass/commits/master)

A JS implementation of RGASS, a CRDT synchronization algorithm presented in research paper by Xiao Lv et al: [http://dx.doi.org/10.1016/j.aei.2016.10.005](http://dx.doi.org/10.1016/j.aei.2016.10.005).

# Getting started

This module is still experimental, but it's easy to play with it already:
1. Clone this repository and
2. `npm install`, then 
3. `npm start` 
4. and open at least two browser windows pointing to `localhost:3000`.

Now you can test its collaborative text editing functionality. There is also a battletest (see below) that will automatically add and delete strings in two text areas concurrently and raise an error if there is a mismatch, as a way to fuzz test the algorithm.

# To run tests

```
npm test
```

# To run battletest

```
npm run battletest
```

# TODO

- [ ] Resolve issue with overlapping concurrent insertions and deletions, that the algorihtm described in the paper doesn't address (there is a currently failing test describing the above scenario).
- [ ] Serialization of Model
- [ ] Snapshotting (related to above)
- [ ] More bulletproofing
