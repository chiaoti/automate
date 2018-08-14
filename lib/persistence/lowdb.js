const debug = require('debug')('automate:lowdb')
const low = require('lowdb')
const FileSync = require('lowdb/adapters/FileSync')

class Lowdb {
  constructor (filePath) {
    this.filePath = filePath
    this.engine = null
  }

  initialize (defaultTables) {
    this.engine = low(new FileSync(this.filePath))
    this.engine.defaults(defaultTables).write()
  }

  find (table, where = {}) {
    return Object.keys(where).length > 0
      ? this.engine
        .get(table)
        .find(where)
        .value()
      : this.engine
        .get(table)
        .value()
  }

  push (table, record) {
    debug(`Push record to table ${table}`, record)
    return this.engine
      .get(table)
      .push(record)
      .write()
  }

  remove (table, where) {
    return this.engine
      .get(table)
      .remove(where)
      .write()
  }

  update (table, where, record) {
    debug(`Update table ${table} where`, where, 'record', record)
    return this.engine
      .get(table)
      .find(where)
      .assign(record)
      .write()
  }
}

module.exports = Lowdb
