const Method = require('./method')
const privates = new WeakMap()

class Service {
  constructor () {
    const defaultProps = {
      name: '',
      description: '',
      serverURL: '',
      methodTag: '',
      category: '',
      runner: null,
      events: [],
      methods: {}
    }
    privates.set(this, defaultProps)
  }

  toObject () {
    return {
      name: this.name,
      description: this.description,
      serverURL: this.serverURL,
      category: this.category,
      runner: this.runner.name,
      events: this.events,
      methods: this.methods.map(m => m.toObject())
    }
  }

  get name () {
    return privates.get(this).name
  }

  set name (name) {
    const props = privates.get(this)
    if (props.name) {
      throw new Error(`Writing to read only property 'name' of service.`)
    }
    props.name = name
  }

  get description () {
    return privates.get(this).description
  }

  set description (desc) {
    const props = privates.get(this)
    if (props.description) {
      throw new Error(`Writing to read only property 'description' of service.`)
    }
    props.description = desc
  }

  get serverURL () {
    return privates.get(this).serverURL
  }

  set serverURL (url) {
    const props = privates.get(this)
    if (props.serverURL) {
      throw new Error(`Writing to read only property 'serverURL' of service.`)
    }
    props.serverURL = url
  }

  get methodTag () {
    return privates.get(this).methodTag
  }

  set methodTag (tag) {
    const props = privates.get(this)
    if (props.methodTag) {
      throw new Error(`Writing to read only property 'methodTag' of service.`)
    }
    props.methodTag = tag
  }

  get category () {
    return privates.get(this).category
  }

  set category (cats) {
    const props = privates.get(this)
    if (props.category) {
      throw new Error(`Writing to read only property 'category' of service.`)
    }
    props.category = cats
  }

  get runner () {
    return privates.get(this).runner
  }

  set runner (runner) {
    const props = privates.get(this)
    if (props.runner) {
      throw new Error(`Writing to read only property 'runner' of service.`)
    }
    props.runner = runner
  }

  registerEvent (event) {
    const props = privates.get(this)

    if (typeof event !== 'string') {
      throw new Error(`Argument 'event' must be a string.`)
    }

    props.events.push(event)
  }

  get events () {
    return privates.get(this).events
  }

  registerMethod (method) {
    const { methods } = privates.get(this)

    if (!(method instanceof Method)) {
      throw new Error('Argument `method` must be an instance of Method class.')
    }

    method.service = this
    method.runner = this.runner
    methods[method.name] = method
  }

  get methods () {
    const { methods } = privates.get(this)
    return Object.keys(methods).map(name => methods[name])
  }

  findMethod (name) {
    return privates.get(this).methods[name]
  }
}

module.exports = Service
