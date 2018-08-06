const Lowdb = require('./lowdb')

const Persistence = {
  lowdb: Lowdb
}

module.exports = {
  get: function (type) {
    return Persistence[type]
  }
}
