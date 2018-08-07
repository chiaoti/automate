/* global describe, it */
const expect = require('chai').expect
const Automate = require('..')
const {
  Action,
  Flow
} = Automate

describe('Flow', () => {
  const automate = new Automate({ specPath: 'examples/specs/' })

  let PetstoreService
  let flow
  let methodGetPetById

  describe('Load and parse specs', function () {
    it('should load and parse all specs and generate services and methods', function (done) {
      automate.initialize().then(function () {
        PetstoreService = automate.findServiceByName('Petstore')
        methodGetPetById = PetstoreService.findMethod('getPetById')
        done()
      }).catch(function (err) {
        done(err)
      })
    })
  })

  describe('Retry-On-Failure test of a flow using Petstore API', function () {
    flow = new Flow({ name: 'Retry Test' })

    it('should run the flow and retry action 3 times on error', function (done) {
      this.timeout(20000)

      const getPetById = (new Action({
        name: 'GetPetById',
        wait: true,
        timeout: 15000,
        retryCount: 3,
        onErrorAction: Action.Constants.ON_ERROR_RETRY_ACTION
      }))
        .applyMethod(methodGetPetById)
        .withArgs({ petId: 0 })

      // Run the test flow manually
      flow
        .addAction(getPetById)
        .onRetry((error, action, args) => {
          expect(error.message).to.equal('Pet not found')
          expect(action.id).to.equal(getPetById.id)
        })
        .onActionFailed((error, action) => {
          expect(error.message).to.equal('Pet not found')
          expect(action.id).to.equal(getPetById.id)
        })
        .onAfterRunning((error, result) => {
          expect(error.message).to.equal('Pet not found')
          if (!getPetById.canRetry()) done()
        })
        .run()
    })

    it('should run flow.removeActionAtIndex() without error', function (done) {
      flow.removeActionAtIndex(0)
      expect(flow.actions).to.be.empty // eslint-disable-line
      done()
    })
  })
})
