const debug = require('debug')('automate:flow')
const uuid = require('uuid/v4')
const Action = require('./action')
const privates = new WeakMap()

class Flow {
  constructor (props) {
    const now = new Date()
    const defaultProps = {
      id: uuid().replace(/-/g, ''),
      name: 'Untitled Flow',
      description: 'No description for this flow.',
      owner: null,
      createDate: now,
      lastModifiedDate: now,
      lastRunDate: null,
      active: true,
      logo: '',
      tags: [],
      triggers: [],
      actions: []
    }

    privates.set(this, defaultProps)

    if (props) {
      Object.keys(props).forEach((propName) => {
        switch (propName) {
          case 'name':
            this.name = props.name
            break
          case 'description':
            this.description = props.description
            break
          case 'owner':
            this.owner = props.owner
            break
          case 'active':
            this.active = props.active
            break
          case 'logo':
            this.logo = props.logo
            break
          case 'tags':
            props.tags.forEach(tag => this.addTag(tag))
            break
          case 'triggers':
            props.triggers.forEach(ev => this.addTrigger(ev))
            break
          case 'actions':
            props.actions.forEach(action => this.insertAction(action))
            break
        }
      })
    }

    this.callbacks = {
      /* Flow callbacks */
      onBeforeRunning (args) {}, // eslint-disable-line
      onAfterRunning (error, result) {}, // eslint-disable-line
      onIgnoreError (error, action, args) {}, // eslint-disable-line
      onRetry (error, action, args) {}, // eslint-disable-line
      onRestartFlow (error, action, args) {}, // eslint-disable-line
      onStopFlow (error, action, args) {}, // eslint-disable-line
      /* Action callbacks */
      onActionRunning(action) {}, // eslint-disable-line
      onActionSucceeded(action, result) {}, // eslint-disable-line
      onActionFailed(action, error) {}, // eslint-disable-line
    }

    this.run = this.run.bind(this)
  }

  get id () {
    return privates.get(this).id
  }

  get name () {
    return privates.get(this).name
  }

  set name (name) {
    if (typeof name !== 'string') {
      throw new Error('Argument `name` must be a string.')
    }

    privates.get(this).name = name
  }

  get description () {
    return privates.get(this).description
  }

  set description (desc) {
    if (typeof desc !== 'string') {
      throw new Error('Argument `desc` must be a string.')
    }

    privates.get(this).description = desc
  }

  get owner () {
    return privates.get(this).owner
  }

  set owner (user) {
    if (typeof user !== 'object') {
      throw new Error('Argument `user` must be an object.')
    }

    privates.get(this).owner = user
  }

  get createDate () {
    return privates.get(this).createDate
  }

  set createDate (date) {
    if (!(date instanceof Date)) {
      throw new Error('Argument `date` must be an instance of Date.')
    }

    privates.get(this).createDate = date
  }

  get lastModifiedDate () {
    return privates.get(this).lastModifiedDate
  }

  set lastModifiedDate (date) {
    if (!(date instanceof Date)) {
      throw new Error('Argument `date` must be an instance of Date.')
    }

    privates.get(this).lastModifiedDate = date
  }

  get lastRunDate () {
    return privates.get(this).lastRunDate
  }

  set lastRunDate (date) {
    if (!(date instanceof Date)) {
      throw new Error('Argument `date` must be an instance of Date.')
    }

    privates.get(this).lastRunDate = date
  }

  get active () {
    return privates.get(this).active
  }

  set active (active) {
    if (typeof active !== 'boolean') {
      throw new Error('Argument `active` must be boolean type.')
    }

    privates.get(this).active = active
  }

  get logo () {
    return privates.get(this).logo
  }

  set logo (filePath) {
    if (typeof filePath !== 'string') {
      throw new Error('Argument `filePath` must be a string.')
    }

    privates.get(this).logo = filePath
  }

  get tags () {
    return privates.get(this).tags
  }

  addTag (tag) {
    const { tags } = privates.get(this)

    if (typeof tag !== 'string') {
      throw new Error('Argument `tag` must be a string.')
    }

    if (tags.includes(tag)) {
      return this
    }

    tags.push(tag)

    return this
  }

  removeTag (tag) {
    const { tags } = privates.get(this)

    if (typeof tag !== 'string') {
      throw new Error('Argument `tag` must be a string.')
    }

    const index = tags.indexOf(tag)

    if (index < 0) {
      throw new Error(`Tag '${tag}' not found.`)
    }

    tags.splice(index, 1)
  }

  get triggers () {
    return privates.get(this).triggers
  }

  addTrigger (event) {
    const { triggers } = privates.get(this)

    if (typeof event !== 'string') {
      throw new Error('Argument `event` must be a string.')
    }

    if (triggers.includes(event)) {
      return this
    }

    triggers.push(event)

    return this
  }

  removeTrigger (event) {
    const { triggers } = privates.get(this)

    if (typeof event !== 'string') {
      throw new Error('Argument `event` must be a string.')
    }

    const index = triggers.indexOf(event)

    if (index < 0) {
      throw new Error(`Event '${event}' not found.`)
    }

    triggers.splice(index, 1)

    return this
  }

  get actions () {
    return privates.get(this).actions
  }

  addAction (action) {
    return this.insertAction(action)
  }

  insertAction (action, pos) {
    const { actions } = privates.get(this)

    if (!(action instanceof Action)) {
      throw new Error('Argument `action` must be an instance of Action.')
    }

    if (pos !== undefined && typeof pos !== 'number') {
      throw new Error('Argument `pos` must be a number.')
    }

    if (pos === undefined) {
      actions.push(action)
    } else {
      actions.splice(pos, 0, action)
    }

    return this
  }

  moveAction (fromPos, toPos) {
    const { actions } = privates.get(this)

    if (typeof fromPos !== 'number' || typeof toPos !== 'number') {
      throw new Error('Arguments must be numbers.')
    }

    actions.splice(toPos, 0, actions.splice(fromPos, 1)[0])
    return this
  }

  removeAction (action) {
    const { actions } = privates.get(this)

    if (!(action instanceof Action)) {
      throw new Error('Argument `action` must be an instance of Action.')
    }

    let pos = actions.findIndex(act => act.id === action.id)
    if (pos >= 0) {
      actions.splice(pos, 1)
      return this
    }

    return this
  }

  removeActionAtIndex (pos) {
    const { actions } = privates.get(this)

    if (typeof pos !== 'number') {
      throw new Error('Argument `pos` must be a number.')
    }

    if (pos >= actions.length) {
      throw new Error(`No action element at position ${pos}.`)
    }

    actions.splice(pos, 1)

    return this
  }

  removeAllActions () {
    privates.get(this).actions = []
    return this
  }

  reset () {
    privates.get(this).actions.forEach(action => action.reset())
    return this
  }

  onBeforeRunning (callback) {
    if (callback) {
      this.callbacks.onBeforeRunning = callback
    }
    return this
  }

  onAfterRunning (callback) {
    if (callback) {
      this.callbacks.onAfterRunning = callback
    }
    return this
  }

  onActionRunning (callback) {
    if (callback) {
      this.callbacks.onActionRunning = callback
    }
    return this
  }

  onActionSucceeded (callback) {
    if (callback) {
      this.callbacks.onActionSucceeded = callback
    }
    return this
  }

  onActionFailed (callback) {
    if (callback) {
      this.callbacks.onActionFailed = callback
    }
    return this
  }

  onIgnoreError (callback) {
    if (callback) {
      this.callbacks.onIgnoreError = callback
    }
    return this
  }

  onRetry (callback) {
    if (callback) {
      this.callbacks.onRetry = callback
    }
    return this
  }

  onRestartFlow (callback) {
    if (callback) {
      this.callbacks.onRestartFlow = callback
    }
    return this
  }

  onStopFlow (callback) {
    if (callback) {
      this.callbacks.onStopFlow = callback
    }
    return this
  }

  run (initArgs = {}) {
    /* Reset internal status of all actions */
    this.reset()

    /* Freeze initial argument object */
    Object.freeze(initArgs)

    return new Promise((resolve, reject) => {
      const { active, name, actions } = privates.get(this)

      if (!active) {
        const error = new Error(`Flow '${name}' is inactive.`)
        this.callbacks.onAfterRunning(error, null)
        reject(error)
        return
      }

      if (!actions) {
        const error = new Error(`No action for this flow.`)
        this.callbacks.onAfterRunning(error, null)
        reject(error)
        return
      }

      (function next (i, args) {
        if (i === 0) {
          this.callbacks.onBeforeRunning(args)
        } else if (i === actions.length) {
          this.callbacks.onAfterRunning(null, args)
          resolve(args)
          return
        }

        const action = actions[i]
        const nextSyncOrPassThrough = action.wait ? next.bind(this) : function () {}
        const nextOrPassThrough = action.wait ? function () {} : next.bind(this)

        debug(`Running action ${action.name}...`)
        this.callbacks.onActionRunning(action)

        action
          .onIgnoreError((error) => {
            this.callbacks.onIgnoreError(error, action, args)
            nextSyncOrPassThrough(i + 1, error)
          })
          .onRetry((error) => {
            this.callbacks.onRetry(error, action, args)
            nextSyncOrPassThrough(i, { __error: error, ...args })
          })
          .onRestartFlow((error) => {
            this.callbacks.onRestartFlow(error, action, args)
            nextSyncOrPassThrough(0, { __error: error, ...initArgs })
          })
          .onStopFlow((error) => {
            this.callbacks.onStopFlow(error, action, args)
            return error // Just return error to stop flow
          })
          .run(args)
          .then((result) => {
            debug(`Action '${action.method.name}' success, result = %O`, result)
            this.callbacks.onActionSucceeded(action, result)
            nextSyncOrPassThrough(i + 1, result)
          })
          .catch((error) => {
            this.callbacks.onActionFailed(error, action)
            this.callbacks.onAfterRunning(error, null)
            reject(error)
          })

        nextOrPassThrough(i + 1)
      }).call(this, 0, initArgs)
    })
  }
}

module.exports = Flow
