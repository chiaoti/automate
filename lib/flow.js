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
      owner: '',
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

    this.callbacks = {
      /* Flow callbacks */
      onPropUpdated (flow, propName, prevProp, nextProp) {},
      onBeforeRunning (args) {},
      onAfterRunning(error, flow, result) {}, // eslint-disable-line
      onIgnoreError(error, action, args) {}, // eslint-disable-line
      onRetry(error, action, args) {}, // eslint-disable-line
      onRestartFlow(error, action, args) {}, // eslint-disable-line
      onStopFlow(error, action, args) {}, // eslint-disable-line
      /* Action callbacks */
      onActionAdded (flow, action, pos) {},
      onActionMoved (flow, action, pos) {},
      onActionRemoved (flow, action) {},
      onActionAllRemoved (flow) {},
      onActionRunning (flow, action) {},
      onActionSucceeded (flow, action, result) {},
      onActionFailed (error, flow, action) {}, // eslint-disable-line
    }

    this.run = this.run.bind(this)

    if (props) {
      Object.keys(props).forEach((propName) => {
        switch (propName) {
          case 'id':
            privates.get(this).id = props.id
            break
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
  }

  toObject () {
    const props = privates.get(this)
    return {
      ...props,
      actions: props.actions.map(act => act.toObject())
    }
  }

  toString () {
    return this.toObject().toString(...arguments)
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
    const prev = privates.get(this).name
    privates.get(this).name = name
    this.callbacks.onPropUpdated(this, 'name', prev, name)
  }

  get description () {
    return privates.get(this).description
  }

  set description (desc) {
    if (typeof desc !== 'string') {
      throw new Error('Argument `desc` must be a string.')
    }
    const prev = privates.get(this).description
    privates.get(this).description = desc
    this.callbacks.onPropUpdated(this, 'description', prev, desc)
  }

  get owner () {
    return privates.get(this).owner
  }

  set owner (user) {
    if (typeof user !== 'string') {
      throw new Error('Argument `user` must be a string.')
    }
    const prev = privates.get(this).owner
    privates.get(this).owner = user
    this.callbacks.onPropUpdated(this, 'owner', prev, user)
  }

  get createDate () {
    return privates.get(this).createDate
  }

  set createDate (date) {
    if (!(date instanceof Date)) {
      throw new Error('Argument `date` must be a Date instance.')
    }
    const prev = privates.get(this).createDate
    privates.get(this).createDate = date
    this.callbacks.onPropUpdated(this, 'createDate', prev, date)
  }

  get lastModifiedDate () {
    return privates.get(this).lastModifiedDate
  }

  set lastModifiedDate (date) {
    if (!(date instanceof Date)) {
      throw new Error('Argument `date` must be a Date instance.')
    }
    const prev = privates.get(this).lastModifiedDate
    privates.get(this).lastModifiedDate = date
    this.callbacks.onPropUpdated(this, 'lastModifiedDate', prev, date)
  }

  get lastRunDate () {
    return privates.get(this).lastRunDate
  }

  set lastRunDate (date) {
    if (!(date instanceof Date)) {
      throw new Error('Argument `date` must be a Date instance.')
    }
    const prev = privates.get(this).lastRunDate
    privates.get(this).lastRunDate = date
    this.callbacks.onPropUpdated(this, 'lastRunDate', prev, date)
  }

  get active () {
    return privates.get(this).active
  }

  set active (active) {
    if (typeof active !== 'boolean') {
      throw new Error('Argument `active` must be a boolean.')
    }
    const prev = privates.get(this).active
    privates.get(this).active = active
    this.callbacks.onPropUpdated(this, 'active', prev, active)
  }

  get logo () {
    return privates.get(this).logo
  }

  set logo (filePath) {
    if (typeof filePath !== 'string') {
      throw new Error('Argument `filePath` must be a string.')
    }
    const prev = privates.get(this).logo
    privates.get(this).logo = filePath
    this.callbacks.onPropUpdated(this, 'logo', prev, filePath)
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

    this.callbacks.onPropUpdated(this, 'tags', tags, tag)

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

    this.callbacks.onPropUpdated(this, 'tags', tags, tag)

    return this
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

    debug(`[Flow][${this.name}] add trigger: ${event}`)
    triggers.push(event)

    this.callbacks.onPropUpdated(this, 'triggers', triggers, event)

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

    debug(`[Flow][${this.name}] remove trigger: ${event}`)
    triggers.splice(index, 1)

    this.callbacks.onPropUpdated(this, 'triggers', triggers, event)

    return this
  }

  get actions () {
    return privates.get(this).actions
  }

  getActionById (id) {
    return privates.get(this).actions.find(action => action.id === id)
  }

  addAction (action) {
    return this.insertAction(action)
  }

  insertAction (action, pos) {
    const { actions } = privates.get(this)

    if (!(action instanceof Action)) {
      throw new Error(`Argument 'action' must be an Action instance.`)
    }

    if (pos !== undefined && typeof pos !== 'number') {
      throw new Error('Argument `pos` must be a number.')
    }

    if (pos === undefined) {
      actions.push(action)
    } else {
      actions.splice(pos, 0, action)
    }

    debug(`[Flow][${this.name}] insert action: ${action}`)

    this.callbacks.onPropUpdated(this, 'actions', actions, action)
    this.callbacks.onActionAdded(this, action, pos)

    return this
  }

  moveAction (action, toPos) {
    const { actions } = privates.get(this)

    if (!(action instanceof Action)) {
      throw new Error('Argument `action` must be an Action instance.')
    }

    if (typeof toPos !== 'number') {
      throw new Error('Arguments must be numbers.')
    }

    const fromPos = actions.findIndex(act => act.id === action.id)

    if (fromPos < 0) {
      throw new Error('Given action not found.')
    }

    if (toPos >= actions.length) {
      toPos = actions.length - 1
    }

    actions.splice(toPos, 0, actions.splice(fromPos, 1)[0])

    debug(`[Flow][${this.name}] move action at position ${fromPos} to ${toPos}.`)

    this.callbacks.onPropUpdated(this, 'actions', actions)
    this.callbacks.onActionMoved(this, fromPos, toPos)

    return this
  }

  removeAction (action) {
    if (!(action instanceof Action)) {
      throw new Error('Argument `action` must be an Action instance.')
    }

    return this.removeActionById(action.id)
  }

  removeActionById (id) {
    const { actions } = privates.get(this)

    if (typeof id !== 'string') {
      throw new Error('Argument `id` must be a string.')
    }

    let pos = actions.findIndex(act => act.id === id)
    if (pos >= 0) {
      const action = actions.splice(pos, 1)[0]

      debug(`[Flow][${this.name}] remove action: ${action}`)

      this.callbacks.onPropUpdated(this, 'actions', actions, action)
      this.callbacks.onActionRemoved(this, action)
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

    const removed = actions.splice(pos, 1)

    if (removed.length > 0) {
      this.callbacks.onPropUpdated(this, 'actions', actions, removed[0])
      this.callbacks.onActionRemoved(this, removed[0])
    }

    debug(`[Flow][${this.name}] remove action at position ${pos}.`)

    return this
  }

  removeAllActions () {
    privates.get(this).actions = []
    this.callbacks.onPropUpdated(this, 'actions', privates.get(this).actions)
    this.callbacks.onActionAllRemoved(this)
    debug(`[Flow][${this.name}] remove all actions.`)
    return this
  }

  __reset () {
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

  onPropUpdated (callback) {
    if (callback) {
      this.callbacks.onPropUpdated = callback
    }
    return this
  }

  onActionAdded (callback) {
    if (callback) {
      this.callbacks.onActionAdded = callback
    }
    return this
  }

  onActionMoved (callback) {
    if (callback) {
      this.callbacks.onActionMoved = callback
    }
    return this
  }

  onActionRemoved (callback) {
    if (callback) {
      this.callbacks.onActionRemoved = callback
    }
    return this
  }

  onActionAllRemoved (callback) {
    if (callback) {
      this.callbacks.onActionAllRemoved = callback
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

  destroy () {
    this.callbacks = {
      /* Flow callbacks */
      onPropUpdated (flow, propName, prevProp, nextProp) {},
      onBeforeRunning (args) {},
      onAfterRunning(error, result) {}, // eslint-disable-line
      onIgnoreError(error, action, args) {}, // eslint-disable-line
      onRetry(error, action, args) {}, // eslint-disable-line
      onRestartFlow(error, action, args) {}, // eslint-disable-line
      onStopFlow(error, action, args) {}, // eslint-disable-line
      /* Action callbacks */
      onActionAdded (flow, action, pos) {},
      onActionMoved (flow, action, pos) {},
      onActionRemoved (flow, action) {},
      onActionAllRemoved (flow) {},
      onActionRunning (flow, action) {},
      onActionSucceeded (flow, action, result) {},
      onActionFailed(error, flow, action) {}, // eslint-disable-line
    }
  }

  run (initArgs = {}) {
    /* Reset internal status of all actions */
    this.__reset()

    /* Freeze initial argument object */
    Object.freeze(initArgs)

    const { active, name, actions } = privates.get(this)

    if (!active) {
      const error = new Error(`Flow '${name}' is inactive.`)
      this.callbacks.onAfterRunning(error, this)
      return
    }

    if (!actions) {
      const error = new Error(`Missing 'actions' property for the flow.`)
      this.callbacks.onAfterRunning(error, this)
      return
    }

    this.lastRunDate = new Date()

    ;(function next (i, args) {
      if (i === 0) {
        this.callbacks.onBeforeRunning(this, args)
      }

      if (i === actions.length) {
        this.callbacks.onAfterRunning(null, this, args)
        return
      }

      debug(`Running action @${i} (Total ${actions.length} actions)...`)

      const action = actions[i]
      const nextSyncOrPassThrough = action.wait ? next.bind(this) : function () {}
      const nextOrPassThrough = action.wait ? function () {} : next.bind(this)

      this.callbacks.onActionRunning(this, action)

      action
        .onIgnoreError((error) => {
          this.callbacks.onIgnoreError(error, this, action, args)
          nextSyncOrPassThrough(i + 1, error)
        })
        .onRetry((error) => {
          this.callbacks.onRetry(error, this, action, args)
          nextSyncOrPassThrough(i, { __error: error, ...args })
        })
        .onRestartFlow((error) => {
          this.callbacks.onRestartFlow(error, this, action, args)
          nextSyncOrPassThrough(0, { __error: error, ...initArgs })
        })
        .onStopFlow((error) => {
          this.callbacks.onStopFlow(error, this, action, args)
          return error // Just return error to stop flow
        })
        .run(args)
        .then((result) => {
          debug(`Action '${action.method.name}' success, result = %O`, result)
          this.callbacks.onActionSucceeded(this, action, result)
          nextSyncOrPassThrough(i + 1, result)
        })
        .catch((error) => {
          this.callbacks.onActionFailed(error, this, action)
          this.callbacks.onAfterRunning(error, this)
        })

      nextOrPassThrough(i + 1)
    }).call(this, 0, initArgs)
  }
}

module.exports = Flow
