const debug = require('debug')('automate:memdb')

class Memdb {
  constructor () {
    this.collection = {}
  }

  initialize (defaultTables) {
    this.collection = { ...defaultTables }
  }

  find (table, where = {}) {
    const keys = Object.keys(where)
    return keys.length > 0
      ? this.collection[table]
        .filter(data => keys.every(key => data[key] === where[key]))
      : this.collection[table]
  }

  push (table, record) {
    debug(`Push record to table ${table}`, record)
    this.collection[table].push(record)
  }

  remove (table, where) {
    debug(`Update table '${table}' where`, where)
    const idx = this.collection[table]
      .findIndex(data => Object.keys(where).every(key => data[key] === where[key]))
    if (idx >= 0) {
      this.collection[table].splice(idx, 1)
    }
  }

  update (table, where, record) {
    debug(`Update table '${table}' where`, where, 'record', record)
    const idx = this.collection[table]
      .findIndex(data => Object.keys(where).every(key => data[key] === where[key]))
    if (idx >= 0) {
      this.collection[table][idx] = record
    }
  }
}

module.exports = Memdb
