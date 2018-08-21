/* global describe, it, after */
const fs = require('fs')
const EventEmitter = require('events')
const expect = require('chai').expect
const Automate = require('..')

const OUT = 'OUT'
const IN = 'IN'

describe('Persistence', function () {
  const eventEmitter = new EventEmitter()
  const automate = {
    OUT: new Automate({
      standalone: false,
      paths: {
        specs: 'examples/specs/',
        db: 'test/02_persistence.db'
      }
    }),
    IN: null
  }

  const fixtures = {
    services: [
      'CoreFunction'
    ],
    flows: [{
      id: 'FLOW_ID_MAIN',
      name: 'Persistence Test',
      triggers: [Automate.InternalEvents.Autorun],
      tags: ['Test', 'Persistence']
    }, {
      id: 'FLOW_ID_SUBFLOW_1',
      name: 'Subflow #1',
      triggers: [],
      tags: ['Test', 'Persistence']
    }, {
      id: 'FLOW_ID_SUBFLOW_2',
      name: 'Subflow #2',
      triggers: [],
      tags: ['Test', 'Persistence']
    }, {
      id: 'FLOW_ID_SUBFLOW_3',
      name: 'Subflow #3',
      triggers: [],
      tags: ['Test', 'Persistence']
    }, {
      id: 'FLOW_ID_SUBFLOW_4',
      name: 'Subflow #4',
      triggers: [],
      tags: ['Test', 'Persistence']
    }],
    methods: [
      'log',
      'delay',
      'setVariable',
      'link',
      'switch'
    ],
    actions: {
      FLOW_ID_MAIN: [{
        name: 'Log',
        method: 'log',
        args: { message: `Let's go` }
      }, {
        name: 'Delay1',
        method: 'delay',
        args: { ms: 1000 }
      }, {
        name: 'Selector',
        method: 'switch',
        args: {
          target: 'Argument',
          property: 'message',
          cases: [
            {
              rule: 'contains',
              value: 'hello',
              flow: 'FLOW_ID_SUBFLOW_1'
            },
            {
              rule: 'contains',
              value: 'go',
              flow: 'FLOW_ID_SUBFLOW_2'
            }
          ]
        }
      }],

      FLOW_ID_SUBFLOW_1: [{
        name: 'Start Subflow 1',
        method: 'log',
        args: { message: `Oops, Subflow #1 shouldn't be run!` }
      }],

      FLOW_ID_SUBFLOW_2: [{
        name: 'Start Subflow 2',
        method: 'log',
        args: { message: 'Running subflow #2...' }
      }, {
        name: 'Set Variables',
        method: 'setVariable',
        args: {
          variables: [
            { from: 'Subflow #2' },
            { to: 'Subflow #3' }
          ]
        }
      }, {
        name: 'Delay2',
        method: 'delay',
        args: { ms: 1000 }
      }, {
        name: 'Link to Subflow #3',
        method: 'link',
        args: { flow: 'FLOW_ID_SUBFLOW_3' }
      }],

      FLOW_ID_SUBFLOW_3: [{
        name: 'Start Subflow 3',
        method: 'log',
        args: { message: 'Running subflow #3...' }
      }, {
        name: 'Delay3',
        method: 'delay',
        args: { ms: 1000 }
      }, {
        name: 'Log Test Result',
        method: 'log',
        args: { message: 'Done' }
      }],

      FLOW_ID_SUBFLOW_4: [{
        name: 'Start Subflow 4',
        method: 'log',
        args: { message: 'Running subflow #4...' }
      }]
    }
  }

  const outputs = {
    services: {},
    flows: {},
    methods: {},
    actions: {}
  }

  describe('Load and parse specs', function () {
    it('should load and parse all specs and generate services and methods', function (done) {
      automate[OUT].initialize()
        .then(function () { done() })
        .catch(done)
    })
  })

  describe('Create test flow', function () {
    it('should loaded services successfully', function (done) {
      fixtures.services.forEach((service) => {
        outputs.services[service] = automate[OUT].findServiceByName(service)
      })
      done()
    })

    it('should found needed methods for creating a test flow.', function (done) {
      /* Core function methods */
      fixtures.methods.forEach((method) => {
        outputs.methods[method] = outputs.services['CoreFunction'].findMethod(method)
      })
      done()
    })

    it('should create a main test flow and its subflows without error', function (done) {
      fixtures.flows.forEach((flowProps) => {
        outputs.flows[flowProps.id] = automate[OUT].createFlow({
          id: flowProps.id,
          name: flowProps.name
        })
        flowProps.triggers.forEach(event => outputs.flows[flowProps.id].addTrigger(event))
        flowProps.tags.forEach(tag => outputs.flows[flowProps.id].addTag(tag))

        outputs.actions[flowProps.id] = fixtures.actions[flowProps.id].map((actionProps) => {
          return automate[OUT].createAction({ name: actionProps.name })
            .applyMethod(outputs.methods[actionProps.method])
            .withArgs(actionProps.args)
        })

        // Add actions in reverse order so we can test action movement function later
        outputs.actions[flowProps.id].slice().reverse().forEach((action) => {
          outputs.flows[flowProps.id].addAction(action)
        })
      })

      done()
    })
  })

  describe('Load from persistence', function () {
    it('should create another automate instance', function (done) {
      automate[IN] = new Automate({
        standalone: false,
        paths: {
          specs: 'examples/specs/',
          db: 'test/02_persistence.db'
        }
      })

      automate[IN].initialize()
        .then(function () {
          automate[IN].flows[3]
            .onAfterRunning((error, flow, result) => { // eslint-disable-line
              eventEmitter.emit('TEST OK')
            })
          done()
        })
        .catch(done)
    })

    it('should load flows and actions from persistence', function (done) {
      // automate[IN].flows.forEach((flow) => {
      //   console.log(require('util').inspect(flow.toObject(), { depth: null, compact: false }))
      // })
      expect(automate[IN].flows).to.be.an('array').to.have.lengthOf(fixtures.flows.length)
      automate[IN].flows.forEach((flow) => {
        expect(flow.actions).to.be.an('array').to.have.lengthOf(fixtures.actions[flow.id].length)
        flow.actions.forEach(action => expect(action.toObject()).to.be.not.empty)
      })
      done()
    })

    it('should move all actions in right order', function (done) {
      automate[IN].flows.forEach((flow) => {
        flow.actions.slice().reverse().forEach((action, idx) => {
          flow.moveAction(action, idx)
        })
      })
      done()
    })

    it('should run the flow and get the result without error', function (done) {
      this.timeout(15000)

      eventEmitter.on('TEST OK', () => {
        done()
      })

      // Here we go
      automate[IN].start()
    })
  })

  after(function () {
    automate[IN].stop()
    fs.unlinkSync('test/02_persistence.db')
  })
})
