const fs = require('fs')
const path = require('path')
const EventEmitter = require('events')
const specParser = require('./spec-parser')
const Persistence = require('./persistence')
const { InternalEvents } = require('./event')
const Flow = require('./flow')
const Action = require('./action')
const Method = require('./method')
const Service = require('./service')
const privates = new WeakMap()

const DONT_SAVE_TO_DB = true

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
    super()

    if (!props.paths || !props.paths.specs) {
      throw new Error('You must specify `paths.specs` option.')
    }

    const defaultProps = {
      standalone: props.standalone,
      paths: props.paths,
      persistence: {
        type: props.paths.db ? 'lowdb' : 'memory',
        syncDelay: 5000,
        onDataSynchronized: () => {}
      }
    }

    privates.set(this, {
      props: defaultProps,
      initialTables: {
        flows: []
      },
      runtime: {
        services: {},
        runners: {},
        flows: [],
        database: null
      },
      __dbSyncTimer: null
    })

    this.getFlowById = this.getFlowById.bind(this)
    this._updateFlow = this._updateFlow.bind(this)
  }

  get services () {
    const { services } = privates.get(this).runtime
    return Object.keys(services).map(name => services[name])
  }

  get flows () {
    return privates.get(this).runtime.flows
  }

  initialize () {
    const { props, initialTables, runtime } = privates.get(this)
    const internalSpecs = fs.readdirSync(path.resolve(__dirname, '../specs'))
      .map(specfile => path.resolve(__dirname, '../specs', specfile))
    const userSpecs = fs.readdirSync(props.paths.specs)
      .map(specfile => path.join(props.paths.specs, specfile))
    const pParseSpecs = internalSpecs.concat(userSpecs)
      .filter(file => file.endsWith('.yaml') || file.endsWith('.yml'))
      .map(specfile => specParser(this, specfile))

    return Promise.all(pParseSpecs)
      .then((flows) => new Promise((resolve) => {
        const Database = Persistence[props.persistence.type]
        runtime.database = new Database(props.paths.db)
        runtime.database.initialize(initialTables)
        runtime.flows = runtime.database
          .find('flows')
          .map((props) => {
            // NOTE: Do not modify props returned from database
            return this.createFlow({
              ...props,
              actions: props.actions
                .map(props => this.createAction(props))
                .filter(action => action)
            }, DONT_SAVE_TO_DB)
          })
        resolve()
      }))
  }

  start () {
    function exitHandler (options, err) {
      // if (options.cleanup) console.log('clean')
      if (err instanceof Error) console.log(err.stack)
      if (options.exit) process.exit()
    }

    if (privates.get(this).props.standalone) {
      process.stdin.resume()

      // do something when app is closing
      process.on('exit', exitHandler.bind(null, { cleanup: true }))

      // catches ctrl+c event
      process.on('SIGINT', exitHandler.bind(null, { exit: true }))

      // catches "kill pid" (for example: nodemon restart)
      process.on('SIGUSR1', exitHandler.bind(null, { exit: true }))
      process.on('SIGUSR2', exitHandler.bind(null, { exit: true }))

      // catches uncaught exceptions
      process.on('uncaughtException', exitHandler.bind(null, { exit: true }))
    }

    this.on(InternalEvents.Run, this._runFlows)
    this.emit(InternalEvents.Autorun)
  }

  stop () {
    this.removeListener(InternalEvents.Run, this._runFlows)
    if (privates.get(this).props.standalone) {
      process.kill(process.pid, 'SIGINT')
    }
  }

  findServiceByName (name) {
    return privates.get(this).runtime.services[name]
  }

  addService (service) {
    privates.get(this).runtime.services[service.name] = service
  }

  findRunner (name) {
    return privates.get(this).runtime.runners[name]
  }

  registerRunner (name, instance) {
    const { runners } = privates.get(this).runtime
    if (!runners[name]) {
      runners[name] = instance
    } else {
      throw new Error(`Runner instance for ${name} is already exist.`)
    }
  }

  getFlowById (id) {
    return privates.get(this).runtime.flows.find(flow => flow.id === id)
  }

  getFlowByName (name) {
    return privates.get(this).runtime.flows.find(flow => flow.name === name)
  }

  _updateFlow (flow, propName, prevProp, nextProp) {
    const { props, runtime } = privates.get(this)

    // clearTimeout(runtime.__dbSyncTimer)

    // runtime.__dbSyncTimer = setTimeout(() => {
    if (propName === 'triggers') {
      const event = nextProp
      if (prevProp.indexOf(event) >= 0) {
        this.on(event, flow.run)
      } else {
        this.removeListener(event, flow.run)
      }
    }

    // Update flows in database
    runtime.database
      .update('flows', { id: flow.id }, flow.toObject())

    props.persistence.onDataSynchronized()
    // }, props.syncDelay)
  }

  createFlow (props, dontSave) {
    const { database, flows } = privates.get(this).runtime
    const flow = new Flow(props)

    // Bind flow property updater
    flow.onPropUpdated(this._updateFlow)

    // Bind event triggers to the flow
    flow.triggers.forEach(event => this.on(event, flow.run))

    // Save flow to runtime flows
    flows.push(flow)

    if (!dontSave) {
      // Save flow to database
      database.push('flows', flow.toObject())
    }

    return flow
  }

  destroyFlow (flow) {
    const { database, flows } = privates.get(this).runtime

    // Remove bound events
    flow.triggers.forEach(event => this.removeListener(event, flow.run))

    // Remove flow from runtime flows
    flows.splice(flows.findIndex(({ id }) => flow.id === id), 1)

    // Destroy flow
    flow.destroy()

    // Remove flow from database
    database.remove('flows', { id: flow.id })
  }

  _runFlows ({ flows, args }) {
    if (!Array.isArray(flows)) {
      throw new Error(`Expect type of argument 'flows' to be array.`)
    }

    flows
      .map(this.getFlowById)
      .forEach(flow => flow.run(args))
  }

  createAction (props) {
    const action = new Action(props)
    const service = this.findServiceByName(props.service)

    if (service) {
      const method = service.findMethod(props.method)
      if (method) {
        action
          .applyMethod(method)
          .withArgs(props.args)
      }
    }

    return action
  }
}

module.exports = Automate
