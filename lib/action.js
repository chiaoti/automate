const debug = require('debug')('automate:action')
const uuid = require('uuid/v4')
const Method = require('./method')
const privates = new WeakMap()

class Action {
  static get Constants () {
    return Object.freeze({
      ON_ERROR_IGNORE_ACTION: 'ignore',
      ON_ERROR_RETRY_ACTION: 'retry',
      ON_ERROR_RESTART_FLOW: 'restart',
      ON_ERROR_STOP_FLOW: 'stop'
    })
  }

  constructor (props = {}) {
    const error = this._validateProps(props)
    if (error) throw error

    const defaultProps = {
      id: uuid().replace(/-/g, ''),
      name: '',
      description: '',
      method: null,
      args: {},
      wait: true,
      timeout: 15000,
      retryCount: 3,
      onErrorAction: Action.Constants.ON_ERROR_STOP_FLOW,
      transform: {},
      _retry: 0,
      _ignoreErrorCallback () {},
      _retryActionCallback () {},
      _restartFlowCallback () {},
      _stopflowCallback () {},
      _callErrorHandler (error) {
        // Handle ignore error
        if (this.onErrorAction === Action.Constants.ON_ERROR_IGNORE_ACTION) {
          debug(`Action '${this.method.name}' failed, ignoring ...`)
          debug(`Error: %O`, error)
          return this._ignoreErrorCallback(error)
        }

        // Handle retry action
        if (this.onErrorAction === Action.Constants.ON_ERROR_RETRY_ACTION) {
          if (this._retry > 0) {
            debug(`Action '${this.method.name}' failed, retrying ...`)
            debug(`Error: %O`, error)
            return this._retryActionCallback(error)
          }
          return new Error('Retry count exceeded')
        }

        // Handle restart flow
        if (this.onErrorAction === Action.Constants.ON_ERROR_RESTART_FLOW) {
          debug(`Action '${this.method.name}' failed, restarting flow ...`)
          debug(`Error: %O`, error)
          return this._restartFlowCallback(error)
        }

        // Handle stop flow
        if (this.onErrorAction === Action.Constants.ON_ERROR_STOP_FLOW) {
          debug(`Action '${this.method.name}' failed, stopping flow ...`)
          debug(`Error: %O`, error)
          return this._stopflowCallback(error)
        }
      }
    }

    privates.set(this, Object.assign({}, defaultProps, props))

    this.reset()
  }

  get id () {
    return privates.get(this).id
  }

  get name () {
    const { name, method } = privates.get(this)
    return name || method.name
  }

  set name (n) {
    privates.get(this).name = n
  }

  get description () {
    return privates.get(this).description
  }

  set description (desc) {
    privates.get(this).description = desc
  }

  get wait () {
    return privates.get(this).wait
  }

  get timeout () {
    return privates.get(this).timeout
  }

  get onErrorAction () {
    return privates.get(this).onErrorAction
  }

  onIgnoreError (cb) {
    privates.get(this)._ignoreErrorCallback = cb
    return this
  }

  onRetry (cb) {
    privates.get(this)._retryActionCallback = cb
    return this
  }

  onRestartFlow (cb) {
    privates.get(this)._restartFlowCallback = cb
    return this
  }

  onStopFlow (cb) {
    privates.get(this)._stopflowCallback = cb
    return this
  }

  get transform () {
    return privates.get(this).transform
  }

  get retryCount () {
    return privates.get(this).retryCount
  }

  get method () {
    return privates.get(this).method
  }

  get args () {
    return privates.get(this).args
  }

  applyMethod (method) {
    const props = privates.get(this)
    const error = Method.validate(method)
    if (error) throw error
    props.method = method
    return this
  }

  withArgs (args) {
    const props = privates.get(this)
    props.args = args
    return this
  }

  canRetry () {
    return privates.get(this)._retry > 0
  }

  reset () {
    const props = privates.get(this)
    props._retry = props.retryCount + 1
  }

  run (prevResult) {
    return new Promise((resolve, reject) => {
      const props = privates.get(this)
      let mergedArgs = props.args

      --props._retry

      if (typeof prevResult === 'object') {
        mergedArgs = Object.assign({}, prevResult, props.args)
      }

      debug(`Running ${props.method.name} action with arguments %O`, mergedArgs)

      this.method.runner
        .go(this, mergedArgs)
        .then((result) => {
          debug(`Received response: %O`, result)
          resolve(this._transform(result))
        })
        .catch((error) => {
          if (props._callErrorHandler(error)) {
            reject(error)
          }
        })
    })
  }

  _transform (args) {
    const { transform } = privates.get(this)
    if (!transform) return args

    const { $assignTo } = transform
    const _args = {}
    let ptr = _args

    if ($assignTo) {
      ptr = _args[$assignTo] = args
    }

    if (typeof args === 'object') {
      Object.keys(args).forEach((key) => {
        const rkey = transform[key] || key
        ptr[rkey] = args[key]
      })
    }

    return _args
  }

  _validateProps ({ wait, timeout, retryCount, onErrorAction }) {
    if (wait !== undefined && typeof wait !== 'boolean') {
      return new Error('Option `wait` must be boolean type.')
    }

    if (timeout !== undefined && typeof timeout !== 'number') {
      return new Error('Option `timeout` must be a number.')
    }

    if (retryCount !== undefined && typeof retryCount !== 'number') {
      return new Error('Option `retryCount` must be a number.')
    }

    if (onErrorAction !== undefined && [
      Action.Constants.ON_ERROR_IGNORE_ACTION,
      Action.Constants.ON_ERROR_RETRY_ACTION,
      Action.Constants.ON_ERROR_RESTART_FLOW,
      Action.Constants.ON_ERROR_STOP_FLOW
    ].indexOf(onErrorAction) < 0) {
      return new Error(`Expect property 'onErrorAction' to be one of ` +
        `'ignore', 'retry', 'restart' and 'stop', but got '${onErrorAction}'.`)
    }
  }
}

module.exports = Action
