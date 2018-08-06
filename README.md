# Automate
An OpenAPI spec driven automation tool to orchestrate workflows across different services.

## Usage

Let's take a tour by creating an example flow for testing [Swagger Petstore](http://petstore.swagger.io/) service.\
The Petstore API spec with `Automate Extension` can be found [here](examples/specs/Petstore.yaml).

### Install

```
npm install @csy1983/automate
```

### Get started

Assuming we have the spec file [`Petstore.yaml`](examples/specs/Petstore.yaml) installed in `/my/own/specs/`.

```js
const Automate = require('@csy1983/automate')

// Create an automate instance.
const automate = new Automate({ specPath: '/my/own/specs/' })

// Initialization process:
//  - Load and parse OpenAPI specs for generating services and methods
//  - Init event system (TODO)
//  - Init database and load saved flows (TODO)
automate
  .initialize()
  .then(function () {
    // Now you're able to call automate methods.
    // Create a flow here
  })
  .catch(function (err) {
    // Oops! this shouldn't happen.
  })
```

A set of methods is provided by the automate instance for managing actions and flows. You can use them after automate instance is initialized as you can see in the above code.

### Create a flow

Let's create a flow by calling `createFlow()`:

```js
const flow = automate
  .createFlow({
    name: 'Example Flow',
    description: 'An example to test Petstore APIs.'
  })
  .addTrigger(Automate.InternalEvents.Autorun)
```

The flow we've just created does nothing since it still has no action at this moment.

It is worth noting that we add an `Autorun` trigger to the flow.
This means the flow will be triggered to run automatically once the system starts.

A flow can be also triggered by arbitrary events defined by users. We will discuss this later.

### Find methods from specific services

Before creating an action, we first need to find a `method` from a service.

A `method`, contains the definition of arguments and returns, is used for `action runners` to know how to run the action correctly. The codes below shows you the methods we need for creating actions for the example.

```js
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
```

The method name is specified by `operationId` property in the spec.

For all core methods provides by CoreFunction service, check [here](docs/CORE_METHOD.md).

### Create actions

In this section, we will create 5 actions for the flow and illustrate how data flows through all the actions.

```js
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
```

*TBD*

### Add actions to the flow

*TBD*

```js
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
  .onActionFailed((error, action) => {
    // Called while an action is failed to run
  })
  .onAfterRunning((error, result, args) => {
    // The flow completed with result or error
  })
```

### Add flow to automate service

```js
automate.addFlow(flow)
```

*TBD*

### Start automate service

```js
automate.start()
```

*TBD*

### Stop automate service

You can stop automate service whenever you want by calling `stop()` method. For example, you can stop service while a flow completed:

```js
flow.onAfterRunning(() => {
  automate.stop()
})
```

### Full source code

The full source code of above example (petstore-simple-flow) is [here](examples/petstore-simple-flow.js).\
You can also find all example codes [here](examples).

## Trigger a Flow by User-defined Event

Check out this [example](examples/petstore-event-proxy.js) about this topic.

## Action Runners

### Core Runner

*TBD*

### Fetch Runner

*TBD*

### Plans

*TBD*

### Create your own runner

*TBD*

## OpenAPI Spec with Automate Extension

*TBD*

**Petstore.yaml**

```yaml
...ignored

x-automate-services:
  - name: Petstore
    category: Demo
    runner: fetch
    events:
      - name: Inventory Empty
        description: Inventory is empty.
      - name: Inventory Full
        description: Inventory is full.

...ignored
```

**Automate.yaml**

```yaml
...ignored

x-automate-services:
  - name: CoreFunction
    description: Provides automate core function methods.
    runner: core
    methodTag: x-automate-core-functions
    events:
      - name: Autorun
        description: >-
          This event is used to trigger flows that wish to run automatically on `Automate` service starts.
      - name: Error
        description: Errors reported by `error_report` runner.

  - name: Automate
    description: Provides web api for operating Automate service.
    category: Productivity
    runner: fetch

x-automate-core-functions:
  log:
    summary: Log message
    parameters:
      - name: message
        type: string
        required: true
  delay:
    summary: Delay an action.
    parameters:
      - name: ms
        description: Milliseconds
        type: number
        required: true
  link:
    summary: Transfer execution from a flow to another.
    parameters:
      - name: flow
        type: string
        required: true
        description: A flow id
  
  ...ignored
```

## Classes

### Automate Class

#### Members

| Name | Description |
|------|-------------|
| **`Service`** | Service class |
| **`Flow`** | Flow class |
| **`Action`** | Action class |
| **`Method`** | Method class |
| **`InternalEvents`** | Internal event constants |
| `services` | Get all services parsed from specs. *(Read-only)* |
| `flows` | Get all flows in automate service. *(Read-only)* |

#### Methods

| Name | Description |
|------|-------------|
| `initialize()` | Initialize automate service. |
| `start()` | Start automate service. |
| `stop()` | Stop automate service. |
| `findServiceByName (name)` | Find a service by name. |
| `getFlowByID (id)` | Get a flow by ID. |
| `getFlowByName (name)` | Get a flow by name. |
| `createFlow (props)` | Wrapper for creating a new flow.<br>Same as `const flow = new Flow(props)`. |
| `addFlow (flow)` | Add a flow to automate service. |
| `removeFlow (flow)` | Remove a flow from automate service. |
| `createAction (props)` | Wrapper for creating a new action.<br>Same as `const action = new Action(props)`. |

### Service Class

#### Members

| Name | Description |
|------|-------------|
| `name` | Service name *(Read/Write-once)* |
| `description` | Service description *(Read/Write-once)* |
| `serverURL` | Server URL for running the service *(Read/Write-once)* |
| `methodTag` | Method tag definition in the spec *(Read/Write-once)* |
| `category` | Service category *(Read/Write-once)* |
| `runner` | Runner to execute service methods *(Read/Write-once)* |
| `events` | Events supported by the service (Read-only) |
| `methods` | Methods provides by the service (Read-only) |

#### Methods

| Name | Description |
|------|-------------|
| `registerEvent (event)` | Register an event for the service. |
| `registerMethod (method)` | Register a method for the service. |
| `findMethod (name)` | Find a method of the service. |

### Flow Class

#### Members

| Name | Description |
|------|-------------|
| `id` |
| `name` |
| `description` |
| `owner` |
| `createDate` |
| `lastModifiedDate` |
| `lastRunDate` |
| `active` |
| `logo` |
| `tags` |
| `triggers` |
| `actions` |

#### Methods

| Name | Description |
|------|-------------|
| `addTag (tag)` |
| `removeTag (tag)` |
| `addTrigger (event)` |
| `removeTrigger (event)` |
| `addAction (action)` |
| `insertAction (action, pos)` |
| `moveAction (fromPos, toPos)` |
| `removeAction (action)` |
| `removeActionAtIndex (pos)` |
| `removeAllActions ()` |
| `reset ()` |
| `run (initArgs)` |

#### Callbacks

| Name | Description |
|------|-------------|
| `onBeforeRunning` |
| `onAfterRunning` |
| `onActionRunning` |
| `onActionSucceeded` |
| `onActionFailed` |
| `onIgnoreError` |
| `onRetry` |
| `onRestartFlow` |
| `onStopFlow` |

## License

MIT
