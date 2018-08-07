/* global describe, it, after */
const expect = require('chai').expect
const Automate = require('..')
const {
  Service,
  Method,
  Action
} = Automate

describe('Automate', function () {
  const automate = new Automate({ specPath: 'examples/specs/' })

  let CoreFuncService
  let AutomateService
  let PetstoreService
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
  let methodAddPet
  let methodUpdatePet
  let methodFindPetsByStatus
  let methodGetPetById
  let methodUpdatePetWithForm
  let methodDeletePet

  describe('Load and parse specs', function () {
    it('should load and parse all specs and generate services and methods', function (done) {
      automate.initialize().then(function () {
        done()
      }).catch(function (err) {
        done(err)
      })
    })
  })

  describe('Check automate.services', function () {
    it('should loaded services successfully', function (done) {
      CoreFuncService = automate.findServiceByName('CoreFunction')
      AutomateService = automate.findServiceByName('Automate')
      PetstoreService = automate.findServiceByName('Petstore')
      expect(CoreFuncService).to.be.an.instanceof(Service)
      expect(AutomateService).to.be.an.instanceof(Service)
      expect(PetstoreService).to.be.an.instanceof(Service)
      done()
    })

    it('should has properties that matches the specification for CoreFunction service', function (done) {
      expect(CoreFuncService).to.deep.include({
        name: 'CoreFunction',
        events: ['Autorun', 'Error']
      })
      done()
    })

    it('should has properties that matches the specification for Petstore service', function (done) {
      expect(PetstoreService).to.deep.include({
        name: 'Petstore',
        category: 'Demo',
        events: ['Inventory Empty', 'Inventory Full']
      })
      done()
    })

    it('should has 19 methods for Petstore service', function (done) {
      expect(PetstoreService.methods).to.be.an('array').to.have.lengthOf(19)
      done()
    })
  })

  describe('Prepare API methods for running the test', function () {
    it('should found needed methods for creating a test flow.', function (done) {
      /* Automate built-in methods */
      methodLog = CoreFuncService.findMethod('log')
      methodDelay = CoreFuncService.findMethod('delay')
      methodSetVariable = CoreFuncService.findMethod('setVariable')
      methodLink = CoreFuncService.findMethod('link')
      methodSwitch = CoreFuncService.findMethod('switch')

      expect(methodLog).to.be.an.instanceOf(Method)
      expect(methodLog.name).to.equal('log')
      expect(methodLog.service.name).to.equal('CoreFunction')
      expect(methodLog.runner.name).to.equal('CoreRunner')

      expect(methodDelay).to.be.an.instanceOf(Method)
      expect(methodDelay.name).to.equal('delay')
      expect(methodDelay.service.name).to.equal('CoreFunction')
      expect(methodDelay.runner.name).to.equal('CoreRunner')

      expect(methodSetVariable).to.be.an.instanceOf(Method)
      expect(methodSetVariable.name).to.equal('setVariable')
      expect(methodSetVariable.service.name).to.equal('CoreFunction')
      expect(methodSetVariable.runner.name).to.equal('CoreRunner')

      expect(methodLink).to.be.an.instanceOf(Method)
      expect(methodLink.name).to.equal('link')
      expect(methodLink.service.name).to.equal('CoreFunction')
      expect(methodLink.runner.name).to.equal('CoreRunner')

      expect(methodSwitch).to.be.an.instanceOf(Method)
      expect(methodSwitch.name).to.equal('switch')
      expect(methodSwitch.service.name).to.equal('CoreFunction')
      expect(methodSwitch.runner.name).to.equal('CoreRunner')

      /* Petstore methods */
      methodAddPet = PetstoreService.findMethod('addPet')
      methodUpdatePet = PetstoreService.findMethod('updatePet')
      methodFindPetsByStatus = PetstoreService.findMethod('findPetsByStatus')
      methodGetPetById = PetstoreService.findMethod('getPetById')
      methodUpdatePetWithForm = PetstoreService.findMethod('updatePetWithForm')
      methodDeletePet = PetstoreService.findMethod('deletePet')

      expect(methodAddPet).to.be.an.instanceOf(Method)
      expect(methodAddPet.name).to.equal('addPet')
      expect(methodAddPet.service.name).to.equal('Petstore')
      expect(methodAddPet.runner.name).to.equal('FetchRunner')
      expect(methodAddPet.definition).to.be.an('object').that.to.include.all.keys('operation', 'source')

      expect(methodUpdatePet).to.be.an.instanceOf(Method)
      expect(methodUpdatePet.name).to.equal('updatePet')
      expect(methodUpdatePet.service.name).to.equal('Petstore')
      expect(methodUpdatePet.runner.name).to.equal('FetchRunner')
      expect(methodUpdatePet.definition).to.be.an('object').that.to.include.all.keys('operation', 'source')

      expect(methodFindPetsByStatus).to.be.an.instanceOf(Method)
      expect(methodFindPetsByStatus.name).to.equal('findPetsByStatus')
      expect(methodFindPetsByStatus.service.name).to.equal('Petstore')
      expect(methodFindPetsByStatus.runner.name).to.equal('FetchRunner')
      expect(methodFindPetsByStatus.definition).to.be.an('object').that.to.include.all.keys('operation', 'source')

      expect(methodGetPetById).to.be.an.instanceOf(Method)
      expect(methodGetPetById.name).to.equal('getPetById')
      expect(methodGetPetById.service.name).to.equal('Petstore')
      expect(methodGetPetById.runner.name).to.equal('FetchRunner')
      expect(methodGetPetById.definition).to.be.an('object').that.to.include.all.keys('operation', 'source')

      expect(methodUpdatePetWithForm).to.be.an.instanceOf(Method)
      expect(methodUpdatePetWithForm.name).to.equal('updatePetWithForm')
      expect(methodUpdatePetWithForm.service.name).to.equal('Petstore')
      expect(methodUpdatePetWithForm.runner.name).to.equal('FetchRunner')
      expect(methodUpdatePetWithForm.definition).to.be.an('object').that.to.include.all.keys('operation', 'source')

      expect(methodDeletePet).to.be.an.instanceOf(Method)
      expect(methodDeletePet.name).to.equal('deletePet')
      expect(methodDeletePet.service.name).to.equal('Petstore')
      expect(methodDeletePet.runner.name).to.equal('FetchRunner')
      expect(methodDeletePet.definition).to.be.an('object').that.to.include.all.keys('operation', 'source')

      // console.log(require('util').inspect(addPet, { depth: null, compact: false }))
      done()
    })
  })

  describe('Test normal flow operation of Automate using Petstore API', function () {
    it('should create a test flow without error', function (done) {
      flow = automate
        .createFlow({
          name: 'Test Flow',
          description: 'Main flow to run all tests.'
        })
        .addTrigger(Automate.InternalEvents.Autorun)
        .addTag('Test')
        .addTag('Automate')

      expect(flow.name).to.equal('Test Flow')
      expect(flow.description).to.equal('Main flow to run all tests.')
      expect(flow.triggers).to.include(Automate.InternalEvents.Autorun)
      expect(flow.tags).to.include('Test')
      expect(flow.tags).to.include('Automate')

      subflow1 = automate
        .createFlow({
          name: 'Subflow #1',
          description: 'Pet life cycle test flow.'
        })
        .addTag('Test')
        .addTag('Petstore')

      subflow2 = automate
        .createFlow({
          name: 'Subflow #2',
          description: 'Built-in method test flow.'
        })
        .addTag('Test')
        .addTag('Automate')

      subflow3 = automate
        .createFlow({
          name: 'Subflow #3',
          description: 'This flow should not be run.'
        })
        .addTag('Test')
        .addTag('Automate')

      subflow4 = automate
        .createFlow({
          name: 'Subflow #4',
          description: 'This flow should not be run.'
        })
        .addTag('Test')
        .addTag('Automate')

      done()
    })

    it('should run the flow and get the result without error', function (done) {
      this.timeout(10000)

      const footprint = {
        flowCallbacksShouldRun: {
          'Test Flow': {
            onBeforeRunning: false,
            onAfterRunning: false
          },
          'Subflow #1': {
            onBeforeRunning: false,
            onAfterRunning: false
          },
          'Subflow #2': {
            onBeforeRunning: false,
            onAfterRunning: false
          }
        },
        flowCallbacksShouldNotRun: {
          'Subflow #3': {
            onBeforeRunning: false,
            onAfterRunning: false
          },
          'Subflow #4': {
            onBeforeRunning: false,
            onAfterRunning: false
          }
        },
        actionsShouldRun: {
          Log: false,
          Switch: false,
          AddPet: false,
          GetPetById: false,
          UpdatePet: false,
          DeletePet: false,
          Link: false,
          Delay: false,
          SetVariable: false,
          Log2: false
        },
        actionsShouldNotRun: {
          Log3: false,
          Log4: false
        }
      }

      //
      // Main flow
      //

      // [MainFlow][Action #1]: print welcome message
      const log = automate
        .createAction({ name: 'Log' })
        .applyMethod(methodLog)
        .withArgs({ message: 'Starting flow tests, here we go...' })

      expect(log).to.be.an.instanceOf(Action)
      expect(log.name).to.equal('Log')
      expect(log.method).to.equal(methodLog)

      const switches = automate
        .createAction({ name: 'Switch' })
        .applyMethod(methodSwitch)
        .withArgs({
          target: 'Argument',
          property: 'message',
          cases: [
            {
              rule: '=',
              value: 'Hello',
              flow: subflow2.id
            },
            {
              rule: '>',
              value: 10,
              flow: subflow3.id
            },
            {
              rule: '<',
              value: 10,
              flow: subflow3.id
            },
            {
              rule: '>=',
              value: 10,
              flow: subflow3.id
            },
            {
              rule: '<=',
              value: 10,
              flow: subflow3.id
            },
            {
              rule: 'is between',
              value: [ 10, 20 ],
              flow: subflow3.id
            },
            {
              rule: 'is false',
              flow: subflow3.id
            },
            {
              rule: 'is null',
              flow: subflow3.id
            },
            {
              rule: 'contains', // should run this one
              value: 'here we go',
              flow: subflow1.id
            },
            {
              rule: '!=',
              value: 10,
              flow: subflow3.id
            },
            {
              rule: 'is true',
              flow: subflow3.id
            },
            {
              rule: 'is not null',
              flow: subflow3.id
            },
            {
              rule: 'otherwise',
              flow: subflow4.id
            }
          ]
        })

      expect(switches).to.be.an.instanceOf(Action)
      expect(switches.name).to.equal('Switch')
      expect(switches.method).to.equal(methodSwitch)

      flow
        .addAction(log)
        .addAction(switches)
        .onBeforeRunning(() => {
          footprint.flowCallbacksShouldRun[flow.name].onBeforeRunning = true
        })
        .onActionRunning((action) => {
          footprint.actionsShouldRun[action.name] = true
        })
        .onAfterRunning((error, result, args) => { // eslint-disable-line
          footprint.flowCallbacksShouldRun[flow.name].onAfterRunning = true
        })

      //
      // Subflow #1
      //

      /*
       * It appears that https://online.swagger.io is now using a GoDaddy certificate instead of a DigiCert one.
       * Unfortunately, the server still does not send the intermediate certificate, which caused breakage for clients
       * that validated the previous SSL certificate by manually including the DigiCert intermediate certificate.
       *
       * Therefore, fetch call will fail with error:
       *    FetchError: request to https://petstore.swagger.io/v2/pet failed, reason: unable to verify the first certificate
       *
       * So we clear NODE_TLS_REJECT_UNAUTHORIZED environment variable here to work around this.
       *
       * Reference: https://github.com/swagger-api/validator-badge/issues/98
       */
      // process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = 0

      // [Subflow #1][Action #1]: add a new pet
      const addPetArgs = {
        name: 'didi',
        category: {
          id: 1225,
          name: 'Wife'
        },
        photoUrls: ['http://fake.url/didi'],
        status: 'available'
      }
      const addPet = automate
        .createAction({
          name: 'AddPet',
          description: 'Add a pet',
          wait: true,
          timeout: 15000,
          onErrorAction: Action.Constants.ON_ERROR_STOP_FLOW,
          transform: {
            id: 'petId'
          }
        })
        .applyMethod(methodAddPet)
        .withArgs(addPetArgs)

      expect(addPet).to.be.an.instanceOf(Action)
      expect(addPet.name).to.equal('AddPet')
      expect(addPet.method).to.equal(methodAddPet)
      expect(addPet.args).to.equal(addPetArgs)

      // [Subflow #1][Action #2]: find pet `didi` by ID
      const getPetById = automate
        .createAction({
          name: 'GetPetById',
          description: 'Find a pet by Id',
          onErrorAction: Action.Constants.ON_ERROR_STOP_FLOW
        })
        .applyMethod(methodGetPetById)

      expect(getPetById).to.be.an.instanceOf(Action)
      expect(getPetById.name).to.equal('GetPetById')
      expect(getPetById.method).to.equal(methodGetPetById)

      // [Subflow #1][Action #3]: rename pet `didi` to `chardi`
      const updatePet = automate
        .createAction({
          name: 'UpdatePet',
          description: 'Update a pet',
          wait: true,
          timeout: 15000,
          onErrorAction: Action.Constants.ON_ERROR_STOP_FLOW,
          transform: {
            id: 'petId'
          }
        })
        .applyMethod(methodUpdatePet)
        .withArgs({ name: 'chardi' })

      expect(updatePet).to.be.an.instanceOf(Action)
      expect(updatePet.name).to.equal('UpdatePet')
      expect(updatePet.method).to.equal(methodUpdatePet)
      expect(updatePet.args).to.eql({ name: 'chardi' })

      // [Subflow #1][Action #4]: delete the pet
      const deletePet = automate
        .createAction({
          name: 'DeletePet',
          description: 'Delete a pet',
          wait: true,
          timeout: 15000,
          onErrorAction: Action.Constants.ON_ERROR_STOP_FLOW,
          transform: {
            $assignTo: 'message'
          }
        })
        .applyMethod(methodDeletePet)

      expect(deletePet).to.be.an.instanceOf(Action)
      expect(deletePet.name).to.equal('DeletePet')
      expect(deletePet.method).to.equal(methodDeletePet)

      // [Subflow #1][Action #5]: Link to subflow2
      const link = automate
        .createAction({ name: 'Link' })
        .applyMethod(methodLink)
        .withArgs({ flow: subflow2.id })

      expect(link).to.be.an.instanceOf(Action)
      expect(link.name).to.equal('Link')
      expect(link.method).to.equal(methodLink)

      // Add actions to the subflow1
      subflow1
        .addAction(addPet)
        .addAction(getPetById)
        .addAction(updatePet)
        .addAction(deletePet)
        .addAction(link)
        .onActionRunning((action) => {
          footprint.actionsShouldRun[action.name] = true
        })
        .onBeforeRunning((args) => {
          footprint.flowCallbacksShouldRun[subflow1.name].onBeforeRunning = true
        })
        .onAfterRunning((error) => {
          if (error) done(error)
          else footprint.flowCallbacksShouldRun[subflow1.name].onAfterRunning = true
        })

      //
      // Subflow #2
      //

      // [Subflow #2][Action #1]: delay a second
      const delay = automate
        .createAction({ name: 'Delay' })
        .applyMethod(methodDelay)
        .withArgs({ ms: 1000 })

      expect(delay).to.be.an.instanceOf(Action)
      expect(delay.name).to.equal('Delay')
      expect(delay.method).to.equal(methodDelay)

      // [Subflow #2][Action #2]: Set variables test
      const setVariable = automate
        .createAction({ name: 'SetVariable' })
        .applyMethod(methodSetVariable)
        .withArgs({
          variables: [
            { var1: 'Hello Var1' },
            { var2: { hello: 'Var2' } }
          ]
        })

      expect(setVariable).to.be.an.instanceOf(Action)
      expect(setVariable.name).to.equal('SetVariable')
      expect(setVariable.method).to.equal(methodSetVariable)

      // [Subflow #2][Action #3]: log final result
      const log2 = automate
        .createAction({ name: 'Log2' })
        .applyMethod(methodLog)

      expect(log2).to.be.an.instanceOf(Action)
      expect(log2.name).to.equal('Log2')
      expect(log2.method).to.equal(methodLog)

      // Add actions to the subflow2
      subflow2
        .addAction(delay)
        .addAction(setVariable)
        .addAction(log2)
        .onBeforeRunning((args) => {
          footprint.flowCallbacksShouldRun[subflow2.name].onBeforeRunning = true
        })
        .onActionRunning((action) => {
          footprint.actionsShouldRun[action.name] = true
        })
        .onAfterRunning((error, result, args) => {
          if (error) done(error)
          else {
            footprint.flowCallbacksShouldRun[subflow2.name].onAfterRunning = true

            expect(result).to.deep.own.include({
              message: 'OK',
              _variables: [
                { var1: 'Hello Var1' },
                { var2: { hello: 'Var2' } }
              ]
            })

            Object.keys(footprint.flowCallbacksShouldRun)
              .map(flow => footprint.flowCallbacksShouldRun[flow])
              .forEach((callbacks) => {
                expect(callbacks.onBeforeRunning).to.be.true // eslint-disable-line
                expect(callbacks.onAfterRunning).to.be.true // eslint-disable-line
              })

            Object.keys(footprint.flowCallbacksShouldNotRun)
              .map(flow => footprint.flowCallbacksShouldNotRun[flow])
              .forEach((callbacks) => {
                expect(callbacks.onBeforeRunning).to.be.false // eslint-disable-line
                expect(callbacks.onAfterRunning).to.be.false // eslint-disable-line
              })

            Object.keys(footprint.actionsShouldRun)
              .map(action => footprint.actionsShouldRun[action])
              .forEach((isActionRun) => {
                expect(isActionRun).to.be.true // eslint-disable-line
              })

            Object.keys(footprint.actionsShouldNotRun)
              .map(action => footprint.actionsShouldNotRun[action])
              .forEach((isActionRun) => {
                expect(isActionRun).to.be.false // eslint-disable-line
              })

            done()
          }
        })

      //
      // Subflow #3
      //

      // [Subflow #3][Action #1]: print error message
      const log3 = automate
        .createAction({ name: 'Log3' })
        .applyMethod(methodLog)
        .withArgs({ message: 'Subflow #3 should not be executed!' })

      expect(log3).to.be.an.instanceOf(Action)
      expect(log3.name).to.equal('Log3')
      expect(log3.method).to.equal(methodLog)

      subflow3
        .addAction(log3)
        .onBeforeRunning((args) => {
          footprint.flowCallbacksShouldNotRun[subflow3.name].onBeforeRunning = true
        })
        .onActionRunning((action) => {
          footprint.actionsShouldNotRun[action.name] = true
        })
        .onAfterRunning((error, result, args) => { // eslint-disable-line
          footprint.flowCallbacksShouldNotRun[subflow3.name].onAfterRunning = true
        })

      // [Subflow #4][Action #1]: print error message
      const log4 = automate
        .createAction({ name: 'Log4' })
        .applyMethod(methodLog)
        .withArgs({ message: 'Subflow #4 should not be executed!' })

      expect(log4).to.be.an.instanceOf(Action)
      expect(log4.name).to.equal('Log4')
      expect(log4.method).to.equal(methodLog)

      subflow4
        .addAction(log4)
        .onBeforeRunning((args) => {
          footprint.flowCallbacksShouldNotRun[subflow4.name].onBeforeRunning = true
        })
        .onActionRunning((action) => {
          footprint.actionsShouldNotRun[action.name] = true
        })
        .onAfterRunning((error, result, args) => { // eslint-disable-line
          footprint.flowCallbacksShouldNotRun[subflow4.name].onAfterRunning = true
        })

      // Add flow to automate and bind events
      automate.addFlow(flow)
      automate.addFlow(subflow1)
      automate.addFlow(subflow2)
      automate.addFlow(subflow3)
      automate.addFlow(subflow4)

      // Here we go
      automate.start()
    })

    it('should clean up current test', function (done) {
      /* Restore env */
      // process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = 1
      /* Remove flow */
      automate.removeFlow(flow)

      /* Clean actions */
      flow.removeAllActions()
      subflow1.removeAllActions()
      subflow2.removeAllActions()
      subflow3.removeAllActions()
      subflow4.removeAllActions()

      expect(flow.actions).to.be.empty // eslint-disable-line
      expect(subflow1.actions).to.be.empty // eslint-disable-line
      expect(subflow2.actions).to.be.empty // eslint-disable-line
      expect(subflow3.actions).to.be.empty // eslint-disable-line
      expect(subflow4.actions).to.be.empty // eslint-disable-line

      done()
    })
  })

  after(function () {
    automate.stop()
  })
})
