const { URLSearchParams } = require('url')
const fetch = require('node-fetch')
const qs = require('qs')
const FormData = require('form-data')
const Method = require('../method')

const RUNNER_NAME = 'FetchRunner'
const PARAM_TYPES = ['path', 'query', 'header', 'cookie', 'requestBody']
const VERBS = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options']

class FetchRunner {
  constructor (automate) {
    this.automate = automate
  }

  get name () {
    return RUNNER_NAME
  }

  parse (path, spec, callback) {
    VERBS.filter(verb => spec[verb] && !spec[verb].deprecated).forEach((verb) => {
      const api = spec[verb]
      const parameters = {
        path: {},
        query: {},
        header: {},
        cookie: {},
        requestBody: {}
      }
      const returns = {}

      if (!api.parameters) api.parameters = []

      // Directly save request body
      parameters.requestBody = api.requestBody || {}

      // Parse parameters
      api.parameters.forEach((param) => {
        if (!parameters[param.in]) return // Invalid parameter position
        if (!param.schema) return // OpenAPI 3 must have a schema
        switch (param.schema.type) {
          case 'object':
            const props = param.schema.properties || {}
            Object.keys(props).forEach((prop) => {
              parameters[param.in][prop] = props[prop]
              if (param.schema.required && param.schema.required.includes(prop)) {
                parameters[param.in][prop].required = true
              }
            })
            break
          default:
            const shavedParam = { ...param }
            delete shavedParam.in
            delete shavedParam.name
            parameters[param.in][param.name] = shavedParam
            break
        }
      })

      // Parse responses
      Object.keys(api.responses).forEach((code) => {
        returns[code] = api.responses[code]
      })

      // Create a new Method for this API
      const method = new Method()

      method.name = api.operationId
      method.summary = api.summary || ''
      method.description = api.description || ''
      method.definition = {
        operation: verb,
        source: path,
        parameters,
        returns
      }

      callback(method)
    })
  }

  /*
   * @param {Action} action Action instance
   * @param {Object} args   Arguments with previous result
   */
  go (action, args) {
    return new Promise((resolve, reject) => {
      if (!action || !action.method) {
        reject(new Error(`Argument 'action' and 'action.method' should be set properly.`))
        return
      }

      if (action.method.runner.name !== RUNNER_NAME) {
        reject(
          new Error(`This is not a fetch action (runner: ${action.method.runner.name})`)
        )
        return
      }

      const { service, definition } = action.method
      const parameters = definition.parameters
      let url = `${service.serverURL}${definition.source}`
      let fetchSettings = {
        method: definition.operation.toUpperCase(),
        headers: { 'Content-Type': 'application/json' },
        timeout: action.timeout
      }

      // Validate action method parameters & arguments
      let error = this._validateParameters(parameters) ||
                  this._validateArguments(parameters, args)
      if (error) {
        reject(error)
        return
      }

      // Compose URL: replace path args
      Object.keys(parameters.path).forEach((param) => {
        let re = new RegExp(`{${param}}`, 'g')
        url = url.replace(re, encodeURIComponent(args[param]))
      })

      // Compose URL: insert query string
      const queries = Object.keys(parameters.query)
      if (queries.length > 0) {
        const qobj = {}
        queries.forEach((query) => {
          qobj[query] = encodeURIComponent(args[query])
        })

        url += `?${qs.stringify(qobj, { indices: false })}`
      }

      // Set headers
      Object.keys(parameters.header).forEach((header) => {
        fetchSettings.headers[header] = args[header]
      })

      // Set requestBody
      if (parameters.requestBody.content) {
        const contentType = parameters.requestBody.content['application/json']
          ? 'application/json'
          : Object.keys(parameters.requestBody.content)[0]
        const schema = parameters.requestBody.content[contentType].schema
        const setByContentType = {
          'multipart/form-data': function () {
            const form = new FormData()
            Object.keys(schema.properties).forEach((prop) => {
              if (args[prop]) {
                form.append(prop, args[prop])
              }
            })
            fetchSettings.body = form
          },
          'application/x-www-form-urlencoded': function () {
            const params = new URLSearchParams()
            Object.keys(schema.properties).forEach((prop) => {
              if (args[prop]) {
                params.append(prop, args[prop])
              }
            })
            fetchSettings.formData = params
          },
          'application/json': function () {
            const body = {}
            Object.keys(schema.properties).forEach((prop) => {
              if (args[prop]) {
                body[prop] = args[prop]
              }
            })
            fetchSettings.body = JSON.stringify(body)
          }
        }

        fetchSettings.headers['Content-Type'] = contentType

        if (setByContentType[contentType]) {
          setByContentType[contentType]()
        } else {
          setByContentType['application/json']()
        }
      }

      fetch(url, fetchSettings).then((res) => {
        const returns = action.method.definition.returns
        const response = returns[res.status.toString()] || returns.default
        const responseContentType = res.headers.get('content-type').split(';')[0]

        if (!response) {
          reject(
            new Error(`Unable to handle response for action ${action.name}.` +
              `(status = ${res.status}, contentType = ${responseContentType})`)
          )
          return
        }

        if (res.status >= 400) {
          reject(new Error(response.description || res.statusText))
          return
        }

        if (!response.content) {
          resolve(res.statusText)
          return
        }

        if (!response.content[responseContentType]) {
          reject(
            new Error(`Unable to handle content type (${responseContentType}) ` +
              `of response for action ${action.name}.`)
          )
          return
        }

        if (responseContentType === 'application/json') {
          resolve(res.json())
        } else if (responseContentType.startsWith('image') ||
            responseContentType === 'application/octet-stream') {
          resolve(res.buffer())
        } else {
          resolve(res.text())
        }
      }).catch(reject)
    })
  }

  _validateParameters (params) {
    for (let i = 0; i < PARAM_TYPES.length; i++) {
      const ptype = PARAM_TYPES[i]

      if (!params[ptype]) {
        return new Error(`Missing required property '${ptype}'.`)
      }

      if (ptype === 'requestBody' && params.requestBody.content) {
        if (Object.keys(params.requestBody.content).length === 0) {
          return new Error(`Missing content type for 'content' property.`)
        }
      }
    }
  }

  /*
   * Check arguments to see if it is valid for API to run.
   *
   * @param {Object} parameters   Parameter definition of the API method, it looks like:
   *    {
   *      path: {
   *        userId: {
   *          description: 'User ID',
   *          required: true,
   *          schema: {
   *            type: 'string'
   *          }
   *        }
   *      },
   *      query: {
   *        search: {
   *          description: 'Search string',
   *          schema: {
   *            type: 'string'
   *          }
   *        }
   *      },
   *      header: {
   *        'X-Request-ID': {
   *          schema: {
   *            type: 'string',
   *            format: 'uuid'
   *          },
   *          required: true
   *        }
   *      },
   *      cookie: {
   *        debug: {
   *          schema: {
   *            type: integer
   *            enum: [0, 1],
   *            default: 0
   *          }
   *        },
   *        csrftoken: {
   *          schema: {
   *            type: 'string'
   *          }
   *        }
   *      }
   *      requestBody: {
   *        content: {
   *          'application/json': {
   *            schema: {
   *              type: 'object',
   *              required: ['name', 'age', 'email'],
   *              properties: {
   *                name: { type: 'string' },
   *                age: { type: 'integer' },
   *                email: { type: 'string' }
   *              }
   *            }
   *          },
   *          'application/xml': {
   *            schema: {
   *              type: 'object',
   *              ...same as application/json
   *            }
   *          }
   *        }
   *      }
   *    }
   * @param {Object} args   Arguments for the API method, it looks like:
   *    {
   *      userId: '12345678',         // path
   *      name: 'Chardi',             // requestBody
   *      age: 30,                    // requestBody
   *      email: 'chardi@muyu.com',   // requestBody
   *      search: 'Chardi',           // query
   *      'X-Request-ID': '77e1c83b-7bb0-437b-bc50-a7a58e5660ac',   // header
   *      debug: 1,                   // cookie
   *      csrftoken: 'BUSe35dohU3O1MZvDCUOJ'  // cookie
   *    }
   * @return {Error}   Return void if success, otherwise return an Error.
   */
  _validateArguments (parameters, args) {
    for (let i = 0; i < PARAM_TYPES.length; i++) {
      const ptype = PARAM_TYPES[i]
      const pnames = Object.keys(parameters[ptype])

      if (pnames.length === 0) continue

      if (ptype === 'requestBody') {
        const defaultContentType = Object.keys(parameters[ptype].content)[0]
        const paramContent = parameters.requestBody.content['application/json'] ||
          parameters.requestBody.content[defaultContentType]
        const schema = paramContent.schema
        let badparam
        let badformat
        let expformat

        switch (schema.type) {
          case 'string':
            if (defaultContentType === 'text/plain') {
              if (typeof args !== 'string') {
                badformat = typeof args
                expformat = 'string'
              }
            } else if (schema.format === 'binary' || schema.format === 'base64') {
              if (!Buffer.isBuffer(args)) {
                badformat = typeof args
                expformat = 'Buffer'
              }
            }
            break
          case 'object':
          default:
            if (schema.required) {
              schema.required.every((param) => {
                // Check if required argument exist
                if (!args[param]) {
                  badparam = param
                  return false
                }

                const paramType = typeof args[param]
                const { type, format } = schema.properties[param]

                // Check if argument type is correct
                if (format === 'binary' || format === 'base64') {
                  if (!Buffer.isBuffer(args[param])) {
                    badparam = param
                    expformat = 'Buffer'
                    badformat = paramType
                    return false
                  }
                } else if (type === 'array') {
                  if (!Array.isArray(args[param])) {
                    badparam = param
                    expformat = 'Array'
                    badformat = paramType
                    return false
                  }
                } else if (type === 'integer') {
                  if (isNaN(args[param])) {
                    badparam = param
                    expformat = 'Number'
                    badformat = paramType
                  }
                } else if (type !== paramType) {
                  badparam = param
                  expformat = type
                  badformat = paramType
                  return false
                }
                return true
              })
            }
            break
        }

        if (badformat) {
          if (badparam) {
            return new Error(`Expect type of property '${badparam}' in ` +
              `requestBody argument to be ${expformat}, but got ${badformat}.`)
          } else {
            return new Error(`Expect type of requestBody argument to be ` +
              `${expformat}, but got ${badformat}.`)
          }
        }

        if (badparam) {
          return new Error(`Missing required property '${badparam}' in requestBody.`)
        }
      } else {
        // Handle rest of parameter types (path, query, header, cookie) if specified
        for (let n = 0; n < pnames.length; n++) {
          const pname = pnames[n]
          const param = parameters[ptype][pname]
          const expectType = param.schema.type === 'integer' ? 'number' : param.schema.type
          const arg = args[pname]
          const argtype = Array.isArray(arg) ? 'array' : typeof arg

          if (param.required) {
            if (typeof arg === 'undefined') {
              return new Error(`Require argument '${pname}' in '${ptype}' but it was not set.`)
            }

            if (argtype !== expectType) {
              return new Error(`Expect type of argument '${pname}' to be ${expectType},` +
                `but got ${argtype}.`)
            }
          }
        }
      }
    }
  }
}

module.exports = FetchRunner
