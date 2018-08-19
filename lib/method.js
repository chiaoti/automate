class Method {
  static validate (method) {
    if (!method || typeof method !== 'object') {
      return new Error('Method must be an object.')
    }

    if (typeof method.runner !== 'object') {
      return new Error('Method must specify a runner instance.')
    }
  }

  constructor () {
    this.name = ''
    this.summary = ''
    this.description = ''
    this.service = null
    this.runner = null
    this.definition = null
  }

  toObject () {
    return {
      name: this.name,
      summary: this.summary,
      description: this.description,
      service: this.service.name,
      runner: this.runner.name
    }
  }
}

module.exports = Method
