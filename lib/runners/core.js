const deepEql = require('deep-eql')
const Method = require('../method')
const { InternalEvents } = require('../event')
const RUNNER_NAME = 'CoreRunner'

class CoreRunner {
  constructor (automate) {
    this.automate = automate
    return this
  }

  get name () {
    return RUNNER_NAME
  }

  parse (name, spec, callback) {
    const { summary, description, parameters } = spec
    const method = new Method()
    method.name = name
    method.summary = summary || ''
    method.description = description || ''
    method.definition = { parameters }
    callback(method)
  }

  go (action, args) {
    return new Promise((resolve, reject) => {
      if (!action || !action.method) {
        reject(new Error('Invalid arguments for go().'))
        return
      }

      if (action.method.runner.name !== RUNNER_NAME) {
        reject(new Error(`Expect action runner to be ${RUNNER_NAME}, ` +
          `but got ${action.method.runner.name}.`))
        return
      }

      const { parameters } = action.method.definition
      const error = this._validateArguments(parameters, args)
      if (error) {
        reject(error)
        return
      }

      const handler = this._getHandler(action.method.name).bind(this)
      if (!handler) {
        reject(new Error(`Method ${action.method.name} is not supported.`))
        return
      }

      handler(action, args)
        .then(resolve)
        .catch(reject)
    })
  }

  _getHandler (method) {
    return {
      log: this._log,
      delay: this._delay,
      link: this._link,
      split: this._split,
      switch: this._switch,
      setVariable: this._setVariable,
      emit: this._emit
    }[method]
  }

  _getValidator (type) {
    const validators = {
      string: this._validateStringArgument,
      object: this._validateObjectArgument,
      array: this._validateArrayArgument
    }
    return validators[type]
  }

  _validateArguments (parameters, args) {
    parameters.filter(param => param.required).forEach((param) => {
      const ptype = param.type || (param.schema && param.schema.type) || 'object'
      const pname = param.name
      const validator = this._getValidator(ptype)

      if (!validator) {
        return new Error(`Unsupported type of argument: ${ptype}`)
      }

      if (!args[pname]) {
        return new Error(`Required argument '${pname}' was not set.`)
      }

      const error = validator(pname, args[pname])
      if (error) {
        return error
      }
    })
  }

  _validateStringArgument (name, arg) {
    if (typeof arg !== 'string') {
      return new Error(`Expect argument '${name}' to be a string, ` +
        `but got '${typeof arg}'.`)
    }
  }

  _validateObjectArgument (name, arg) {
    if (typeof arg !== 'object') {
      return new Error(`Expect argument '${name}' to be an object, ` +
        `but got '${typeof arg}'.`)
    }
  }

  _validateArrayArgument (name, arg) {
    if (!Array.isArray(arg)) {
      return new Error(`Expect argument '${name}' to be an array, ` +
        `but got '${typeof arg}'.`)
    }
  }

  _log (action, args) {
    return new Promise((resolve, reject) => {
      console.log(`[Logger][${action.name}] ${args.message}`)
      resolve(args)
    })
  }

  _delay (action, args) {
    return new Promise((resolve, reject) => {
      setTimeout(() => resolve(args), args.ms)
    })
  }

  _link (action, args) {
    return new Promise((resolve, reject) => {
      this.automate.emit(InternalEvents.Link, {
        flows: [args.flow],
        args
      })
      resolve(args)
    })
  }

  _split (action, args) {
    return new Promise((resolve, reject) => {
      this.automate.emit(InternalEvents.Link, {
        flows: args.subflows,
        args
      })
      resolve(args)
    })
  }

  _switch (action, args) {
    return new Promise((resolve, reject) => {
      const target = args.target === 'Variable' ? args._variables : args
      const prop = args.property
      let matchedFlow, error

      if (!target[prop]) {
        reject(new Error(`Property ${prop} is undefined.`))
        return
      }

      args.cases
        .sort(({ rule }) => rule === 'otherwise')
        .some(({ rule, value, flow }) => {
          matchedFlow = flow

          switch (rule) {
            case '=':
              if (typeof target[prop] === 'object') {
                return deepEql(target[prop], value)
              }
              return target[prop] == value // eslint-disable-line

            case '!=':
              if (typeof target[prop] === 'object') {
                return !deepEql(target[prop], value)
              }
              return target[prop] != value // eslint-disable-line

            case '>':
              if (isNaN(Number(target[prop])) || isNaN(Number(value))) {
                return false
              }
              return Number(target[prop]) > Number(value)

            case '<':
              if (isNaN(Number(target[prop])) || isNaN(Number(value))) {
                return false
              }
              return Number(target[prop]) < Number(value)

            case '>=':
              if (isNaN(Number(target[prop])) || isNaN(Number(value))) {
                return false
              }
              return Number(target[prop]) >= Number(value)

            case '<=':
              if (isNaN(Number(target[prop])) || isNaN(Number(value))) {
                return false
              }
              return Number(target[prop]) <= Number(value)

            case 'is between':
              if (!Array.isArray(value) || value.length < 2) return false
              if (isNaN(Number(target[prop])) || isNaN(Number(value[0])) || isNaN(Number(value[1]))) {
                return false
              }
              return Number(value[0]) <= Number(target[prop]) && Number(target[prop]) <= Number(value[1])

            case 'is true':
              return Boolean(target[prop])

            case 'is false':
              return !target[prop]

            case 'is null':
              return target[prop] === null || target[prop] === undefined

            case 'is not null':
              return target[prop] !== null && target[prop] !== undefined

            case 'contains':
              return target[prop].toString().includes(value.toString())

            case 'otherwise':
              return true

            default:
              matchedFlow = null
              error = new Error(`Invalid rule specified: ${rule}`)
              return true
          }
        })

      if (error) return reject(error)
      if (matchedFlow) {
        this.automate.emit(InternalEvents.Link, {
          flows: [matchedFlow],
          args
        })
      }
      resolve(args)
    })
  }

  _setVariable (action, args) {
    return new Promise((resolve, reject) => {
      const _args = { ...args }
      _args._variables = args.variables
      delete _args.variables
      resolve(_args)
    })
  }

  _emit (action, args) {
    return new Promise((resolve, reject) => {
      this.automate.emit(args.event, args.payload)
      resolve(args)
    })
  }
}

module.exports = CoreRunner
