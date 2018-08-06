const SwaggerParser = require('swagger-parser')
const Service = require('./service')
const Runners = require('./runners')
const SERVICES_TAG = 'x-automate-services'
const SERVICE_TAG = 'x-automate-service'

module.exports = function (automate, specfile) {
  return new Promise((resolve, reject) => {
    SwaggerParser.validate(specfile).then((spec) => {
      // console.log(require('util').inspect(spec, { depth: null, compact: false }))

      if (!spec[SERVICES_TAG]) {
        resolve()
        return
      }

      /* Parse services */
      const services = spec[SERVICES_TAG].map((servSpec) => {
        const { name, description, category, events, runner, methodTag } = servSpec
        let runnerInstance = automate.getRunnerInstance(runner)
        if (!runnerInstance) {
          const Runner = Runners[runner]
          if (!Runner) {
            console.warn(`Service ${name} specifies '${runner}' as its runner, ` +
              `but it is not supported.`)
            resolve()
            return {}
          }
          runnerInstance = new Runner(automate)
          automate.setRunnerInstance(runner, runnerInstance)
        }

        const service = new Service()
        service.name = name
        service.description = description
        service.category = category
        service.runner = runnerInstance
        service.methodTag = methodTag || 'paths'
        service.serverURL = spec.servers[0].url

        if (events) {
          events.forEach(event => service.registerEvent(event.name))
        }

        automate.addService(service)

        return service
      })

      /* Parse methods for each services */
      services
        .filter(service => service.runner && spec[service.methodTag])
        .forEach((service) => {
          const methodSpec = spec[service.methodTag]
          Object.keys(methodSpec)
            .filter(entry => !entry[SERVICE_TAG] || entry[SERVICE_TAG] === service.name)
            .forEach((entry) => {
              service.runner.parse(entry, methodSpec[entry], (method) => {
                service.registerMethod(method)
              })
            })
        })

      // automate.services.forEach((service) => {
      //   console.log(require('util').inspect(service.methods, { depth: 10, compact: false }))
      // })

      resolve()
    })
      .catch(reject)
  })
}
