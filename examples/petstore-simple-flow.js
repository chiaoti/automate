const Automate = require('..')

// Create an automate instance.
const automate = new Automate({ specPath: 'examples/specs/' })

// Initialization process:
//  - Load and parse OpenAPI specs for generating services and methods
//  - Init event system (TODO)
//  - Init database and load saved flows (TODO)
automate
  .initialize()
  .then(function () {
    // Now you're able to call automate methods.
    // Create a flow here
    const flow = automate
      .createFlow({
        name: 'Example Flow',
        description: 'An example to test Petstore APIs.'
      })
      .addTrigger(Automate.InternalEvents.Autorun)

    // Get CoreFunction & Petstore service.
    const CoreFuncService = automate.findServiceByName('CoreFunction')
    const PetstoreService = automate.findServiceByName('Petstore')

    // Get methods from CoreFunction service.
    const methodLog = CoreFuncService.findMethod('log')
    const methodDelay = CoreFuncService.findMethod('delay')

    // Get methods from Petstore service.
    const methodAddPet = PetstoreService.findMethod('addPet')
    const methodGetPetById = PetstoreService.findMethod('getPetById')
    const methodDeletePet = PetstoreService.findMethod('deletePet')

    // Create `log start message` action
    const logStartMsg = automate
      .createAction({ name: 'LogStartMsg' })
      .applyMethod(methodLog)
      .withArgs({ message: 'Starting petstore test...' })

    // Create `add pet` action
    const addPet = automate
      .createAction({
        name: 'AddPet',
        description: 'Add a pet',
        wait: true,
        timeout: 15000,
        onErrorAction: Automate.Action.Constants.ON_ERROR_STOP_FLOW,
        transform: {
          id: 'petId'
        }
      })
      .applyMethod(methodAddPet)
      .withArgs({
        name: 'kitty',
        category: {
          id: 25,
          name: 'Cats'
        },
        photoUrls: ['http://hello.kitty/avatar.jpg'],
        status: 'available'
      })

    // Create `delay 3 seconds` action
    const delay = automate
      .createAction({ name: 'Delay3Secs' })
      .applyMethod(methodDelay)
      .withArgs({ ms: 3000 })

    // Create `get pet by id` action
    const getPetById = automate
      .createAction({
        name: 'GetPetById',
        description: 'Find a pet by Id',
        onErrorAction: Automate.Action.Constants.ON_ERROR_STOP_FLOW,
        transform: {
          id: 'petId'
        }
      })
      .applyMethod(methodGetPetById)

    const deletePet = automate
      .createAction({
        name: 'DeletePet',
        description: 'Delete a pet',
        wait: true,
        timeout: 15000,
        onErrorAction: Automate.Action.Constants.ON_ERROR_STOP_FLOW,
        transform: {
          $assignTo: 'message'
        }
      })
      .applyMethod(methodDeletePet)

    // Create `log start message` action
    const logResult = automate
      .createAction({ name: 'LogResult' })
      .applyMethod(methodLog)

    // Add actions to the flow
    flow
      .addAction(logStartMsg)
      .addAction(addPet)
      .addAction(delay)
      .addAction(getPetById)
      .addAction(deletePet)
      .addAction(logResult)
      .onBeforeRunning((args) => {
        // Prepare to run the flow
      })
      .onActionRunning((action) => {
        // Called on each action in the flow runs
      })
      .onActionFailed((error, action) => { // eslint-disable-line
        // Called while an action failed to run
      })
      .onAfterRunning((error, result, args) => { // eslint-disable-line
        // The flow completed with result or error
        automate.stop()
      })

    // Add flow to automate service
    automate.addFlow(flow)

    // Start automate service
    automate.start()
  })
  .catch(function (err) { // eslint-disable-line
    // Oops! this shouldn't happen.
    console.error(err)
  })
