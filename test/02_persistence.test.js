/* global describe, it, after */
const fs = require('fs')
const EventEmitter = require('events')
const expect = require('chai').expect
const Automate = require('..')

describe('Persistence', function () {
  const automate = new Automate({
    standalone: false,
    paths: {
      specs: 'examples/specs/',
      db: 'test/02_persistence.db'
    }
  })

  let eventEmitter = new EventEmitter()
  let automate2
  let CoreFuncService
  let flow
  let subflow1
  let subflow2
  let subflow3
  let subflow4
  let methodLog
  let methodDelay
  let methodSetVariable
  let methodLink
  let methodSwitch

  describe('Load and parse specs', function () {
    it('should load and parse all specs and generate services and methods', function (done) {
      automate.initialize()
        .then(function () { done() })
        .catch(done)
    })
  })

  describe('Create test flow', function () {
    it('should loaded services successfully', function (done) {
      CoreFuncService = automate.findServiceByName('CoreFunction')
      done()
    })

    it('should found needed methods for creating a test flow.', function (done) {
      /* Core function methods */
      methodLog = CoreFuncService.findMethod('log')
      methodDelay = CoreFuncService.findMethod('delay')
      methodSetVariable = CoreFuncService.findMethod('setVariable')
      methodLink = CoreFuncService.findMethod('link')
      methodSwitch = CoreFuncService.findMethod('switch')
      done()
    })

    it('should create a test flow and its subflows without error', function (done) {
      flow = automate
        .createFlow({ name: 'Persistence Test' })
        .addTrigger(Automate.InternalEvents.Autorun)
        .addTag('Test')
        .addTag('Persistence')

      subflow1 = automate
        .createFlow({ name: 'Subflow #1' })
        .addTag('Test')
        .addTag('Persistence')

      subflow2 = automate
        .createFlow({ name: 'Subflow #2' })
        .addTag('Test')
        .addTag('Persistence')

      subflow3 = automate
        .createFlow({ name: 'Subflow #3' })
        .addTag('Test')
        .addTag('Persistence')

      subflow4 = automate
        .createFlow({ name: 'Subflow #4' })
        .addTag('Test')
        .addTag('Persistence')

      const logGo = automate
        .createAction({ name: 'Log' })
        .applyMethod(methodLog)
        .withArgs({ message: `Let's go` })

      const delay1s = automate
        .createAction({ name: 'Delay 1s' })
        .applyMethod(methodDelay)
        .withArgs({ ms: 1000 })

      const switchGo = automate
        .createAction({ name: 'Switch' })
        .applyMethod(methodSwitch)
        .withArgs({
          target: 'Argument',
          property: 'message',
          cases: [
            {
              rule: 'contains',
              value: 'Hello',
              flow: subflow1.id
            },
            {
              rule: 'contains',
              value: 'Go',
              flow: subflow2.id
            }
          ]
        })

      const logGo1 = automate
        .createAction({ name: 'Go subflow 1' })
        .applyMethod(methodLog)
        .withArgs({ message: `Running subflow #1` })

      const logGo2 = automate
        .createAction({ name: 'Go subflow 2' })
        .applyMethod(methodLog)
        .withArgs({ message: `Running subflow #2` })

      const setVariable = automate
        .createAction({ name: 'SetVariable' })
        .applyMethod(methodSetVariable)
        .withArgs({
          variables: [
            { from: 'Subflow 2' },
            { to: 'Subflow 3' }
          ]
        })

      const link = automate
        .createAction({ name: 'Link to subflow 3' })
        .applyMethod(methodLink)
        .withArgs({ flow: subflow3.id })

      const logGo3 = automate
        .createAction({ name: 'Go subflow 3' })
        .applyMethod(methodLog)
        .withArgs({ message: `Running subflow #3` })

      const logResult = automate
        .createAction({ name: 'Print result' })
        .applyMethod(methodLog)
        .withArgs({ message: 'Done' })

      const logGo4 = automate
        .createAction({ name: 'Go subflow 4' })
        .applyMethod(methodLog)
        .withArgs({ message: `Running subflow #4` })

      flow
        .addAction(logGo)
        .addAction(delay1s)
        .addAction(switchGo)

      subflow1
        .addAction(logGo1)

      subflow2
        .addAction(logGo2)
        .addAction(delay1s)
        .addAction(setVariable)
        .addAction(link)

      subflow3
        .addAction(logGo3)
        .addAction(delay1s)
        .addAction(logResult)

      subflow4
        .addAction(logGo4)

      done()
    })
  })

  describe('Load from persistence', function () {
    it('should create another automate instance', function (done) {
      automate2 = new Automate({
        standalone: false,
        paths: {
          specs: 'examples/specs/',
          db: 'test/02_persistence.db'
        }
      })

      automate2.initialize()
        .then(function () {
          automate2.flows[3]
            .onAfterRunning((error, flow, result) => { // eslint-disable-line
              eventEmitter.emit('OK')
            })
          done()
        })
        .catch(done)
    })

    it('should load flows and actions from persistence', function (done) {
      // automate2.flows.forEach((flow) => {
      //   console.log(require('util').inspect(flow.toObject(), { depth: null, compact: false }))
      // })
      expect(automate2.flows).to.be.an('array').to.have.lengthOf(5)
      expect(automate2.flows[0].actions).to.be.an('array').to.have.lengthOf(3)
      expect(automate2.flows[1].actions).to.be.an('array').to.have.lengthOf(1)
      expect(automate2.flows[2].actions).to.be.an('array').to.have.lengthOf(4)
      expect(automate2.flows[3].actions).to.be.an('array').to.have.lengthOf(3)
      expect(automate2.flows[4].actions).to.be.an('array').to.have.lengthOf(1)

      automate2.flows[0].actions.forEach(action => expect(action.toObject()).to.be.not.empty)
      automate2.flows[1].actions.forEach(action => expect(action.toObject()).to.be.not.empty)
      automate2.flows[2].actions.forEach(action => expect(action.toObject()).to.be.not.empty)
      automate2.flows[3].actions.forEach(action => expect(action.toObject()).to.be.not.empty)
      automate2.flows[4].actions.forEach(action => expect(action.toObject()).to.be.not.empty)
      done()
    })

    it('should run the flow and get the result without error', function (done) {
      this.timeout(15000)

      eventEmitter.on('OK', () => {
        done()
      })

      // Here we go
      automate2.start()
    })
  })

  after(function () {
    automate2.stop()
    fs.unlinkSync('test/02_persistence.db')
  })
})
