# Rgass.js

[![build status](https://gitlab.coko.foundation/jure/rgass/badges/master/build.svg)](https://gitlab.coko.foundation/jure/rgass/commits/master)
[![coverage report](https://gitlab.coko.foundation/jure/rgass/badges/master/coverage.svg)](https://gitlab.coko.foundation/jure/rgass/commits/master)

A JS implementation of RGASS, a CRDT synchronization algorithm presented in research paper by Xiao Lv et al: [http://dx.doi.org/10.1016/j.aei.2016.10.005](http://dx.doi.org/10.1016/j.aei.2016.10.005).

# Getting started

This module is still experimental, but it's easy to play with it already: Clone this repository and run `npm install`, then `npm start` and open at least two browser windows pointing to `localhost:3000`, to test the collaborative text editing.

# To run tests

```
npm test
```

# To run battletest

```
npm run battletest
```

# TODO

- [ ] Serialization of Model
- [ ] Snapshotting (related to above)
- [ ] More bulletproofing
