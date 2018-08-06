const fs = require('fs')
const path = require('path')
const EventEmitter = require('events').EventEmitter
const specParser = require('./spec-parser')
const Persistence = require('./persistence')
const { InternalEvents } = require('./event')
const Flow = require('./flow')
const Action = require('./action')
const Method = require('./method')
const Service = require('./service')
const privates = new WeakMap()

class Automate extends EventEmitter {
  static get Service () {
    return Service
  }

  static get Flow () {
    return Flow
  }

  static get Action () {
    return Action
  }

  static get Method () {
    return Method
  }

  static get InternalEvents () {
    return InternalEvents
  }

  constructor (props) {
    super(props)

    if (!props.specPath) {
      throw new Error('You must specify `specPath` option.')
    }

    const defaultProps = {
      specPath: props.specPath,
      persistence: {
        type: 'lowdb', // nedb is also considered
        path: ''
      },
      services: {},
      runners: {},
      flows: [],
      actions: []
    }

    privates.set(this, defaultProps)
  }

  get services () {
    const { services } = privates.get(this)
    return Object.keys(services).map(name => services[name])
  }

  get flows () {
    return privates.get(this).flows
  }

  initialize () {
    const { specPath, persistence } = privates.get(this)
    const database = Persistence.get(persistence.type)
    const internalSpecs = fs.readdirSync('specs')
      .map(specfile => path.join('specs/', specfile))
    const userSpecs = fs.readdirSync(specPath)
      .map(specfile => path.join(specPath, specfile))
    const pParseSpecs = internalSpecs.concat(userSpecs)
      .filter(file => file.endsWith('.yaml'))
      .map(specfile => specParser(this, specfile))

    return Promise.all(pParseSpecs).then(() => database.init(persistence.path))
  }

  start () {
    process.stdin.resume()

    function exitHandler (options, err) {
      // if (options.cleanup) console.log('clean')
      if (err instanceof Error) console.log(err.stack)
      if (options.exit) process.exit()
    }

    // do something when app is closing
    process.on('exit', exitHandler.bind(null, { cleanup: true }))

    // catches ctrl+c event
    process.on('SIGINT', exitHandler.bind(null, { exit: true }))

    // catches "kill pid" (for example: nodemon restart)
    process.on('SIGUSR1', exitHandler.bind(null, { exit: true }))
    process.on('SIGUSR2', exitHandler.bind(null, { exit: true }))

    // catches uncaught exceptions
    process.on('uncaughtException', exitHandler.bind(null, { exit: true }))

    this.on(InternalEvents.Trigger, this._triggerFlows)
    this.emit(InternalEvents.Autorun)
  }

  stop () {
    process.kill(process.pid, 'SIGINT')
  }

  findServiceByName (name) {
    return privates.get(this).services[name]
  }

  addService (service) {
    privates.get(this).services[service.name] = service
  }

  getRunnerInstance (name) {
    return privates.get(this).runners[name]
  }

  setRunnerInstance (name, instance) {
    const { runners } = privates.get(this)
    if (!runners[name]) {
      runners[name] = instance
    } else {
      throw new Error(`Runner instance for ${name} is already exist.`)
    }
  }

  getFlowByID (id) {
    return privates.get(this).flows.find(flow => flow.id === id)
  }

  getFlowByName (name) {
    return privates.get(this).flows.find(flow => flow.name === name)
  }

  createFlow (props) {
    return new Flow(props)
  }

  addFlow (flow) {
    // Bind event triggers to the flow
    flow.triggers.forEach(event => this.on(event, flow.run))
    privates.get(this).flows.push(flow)
  }

  removeFlow (flow) {
    const { flows } = privates.get(this)
    const index = flows.findIndex(({ id }) => id === flow.id)
    if (index >= 0) {
      flow.triggers.forEach(event => this.removeListener(event, flow.run))
      flows.splice(index, 1)
    }
  }

  _triggerFlows ({ flows, args }) {
    if (!Array.isArray(flows)) {
      return new Error(`Expect type of argument 'flows' to be array.`)
    }

    flows
      .map(this.getFlowByID.bind(this))
      .forEach(flow => flow.run(args))
  }

  createAction (props) {
    return new Action(props)
  }
}

module.exports = Automate