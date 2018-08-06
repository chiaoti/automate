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
    const flow1 = automate
      .createFlow({ name: 'Flow 1' })
      .addTrigger(Automate.InternalEvents.Autorun)

    const flow2 = automate
      .createFlow({ name: 'Flow 2' })
      .addTrigger('Go Flow 2')

    // Get CoreFunction & Petstore service.
    const CoreFuncService = automate.findServiceByName('CoreFunction')
    const PetstoreService = automate.findServiceByName('Petstore')

    // Get methods from CoreFunction service.
    const methodLog = CoreFuncService.findMethod('log')
    const methodDelay = CoreFuncService.findMethod('delay')
    const methodEmit = CoreFuncService.findMethod('emit')

    // Get methods from Petstore service.
    const methodAddPet = PetstoreService.findMethod('addPet')
    const methodGetPetById = PetstoreService.findMethod('getPetById')
    const methodDeletePet = PetstoreService.findMethod('deletePet')

    // Create `log start flow1` action
    const logStartFlow1 = automate
      .createAction({ name: 'logStartFlow1' })
      .applyMethod(methodLog)
      .withArgs({ message: 'I will trigger flow 2...' })

    // Create `delay 3 seconds` action
    const delay = automate
      .createAction({ name: 'Delay3Secs' })
      .applyMethod(methodDelay)
      .withArgs({ ms: 3000 })

    // Create `link to flow2` action
    const triggerFlow2 = automate
      .createAction({ name: 'TriggerFlow2' })
      .applyMethod(methodEmit)
      .withArgs({
        event: 'Go Flow 2',
        payload: 'Whatever'
      })

    const logStartFlow2 = automate
      .createAction({ name: 'logStartFlow2' })
      .applyMethod(methodLog)
      .withArgs({ message: 'Flow 2 is running...' })

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
    flow1
      .addAction(logStartFlow1)
      .addAction(delay)
      .addAction(triggerFlow2)

    flow2
      .addAction(logStartFlow2)
      .addAction(addPet)
      .addAction(getPetById)
      .addAction(deletePet)
      .addAction(logResult)
      .onAfterRunning((error, result, args) => { // eslint-disable-line
        automate.stop()
      })

    // Add flow to automate service
    automate.addFlow(flow1)
    automate.addFlow(flow2)

    // Start automate service
    automate.start()
  })
  .catch(function (err) { // eslint-disable-line
    // Oops! this shouldn't happen.
    console.error(err)
  })
