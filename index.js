
const crypto = require('crypto')
const express = require('express')
const fs = require('fs-extra')
const jwt = require('jsonwebtoken')
const uuid = require('uuid/v1')
const Logger = require('./logger')

function getSHA(input) {
  let hash = crypto.createHash('sha256')
  hash.update(input + 'a dead sea swim')
  return hash.digest('base64')
}

const app = express()
const logger = new Logger('polyp')
const configuration = {
  port: 8080,
  secret: 'sport has a girlfriend',
  common: {
    iss: 'polyp',
    sub: 'anonymous',
    aud: 'any',
    exp: 3600
  },
  profiles: {}
}

let gen = uuid()
let population = {}

app.use(express.json())

app.post('/api/authorize', function(request, response) {
  let secret
  if (!request.body.secret ||
      !request.body.clientid ||
      !configuration.profiles.hasOwnProperty(secret = getSHA(request.body.secret))) {
    response.sendStatus(403)
  } else {
    let cid = request.body.clientid
    let jti = uuid()
    let payload = Object.assign({jti, gen, cid}, configuration.common, configuration.profiles[secret])\
    if (payload.exp) payload.exp += (new Date).getTime()
    response.send(jwt.sign(payload, configuration.secret, {algorithm: 'RS256'}))
    population[payload.sub] = jti
    logger.info(`Issued token for subject ${payload.sub}, population is ${Object.keys(population).length}`)
  }
})

app.use(function(err, request, response, next) {
  logger.severe(`Request to ${request.originalUrl} failed (${err})`)
  response.sendStatus(500)
})

;(async function() {
  function shutdown(signal) {
    return async function() {
      logger.info('Received ' + signal)
      await Logger.stop()
      process.exit(0)
    }
  }

  process.once('SIGINT', shutdown('SIGINT'))
  process.once('SIGTERM', shutdown('SIGTERM'))

  await Logger.start()

  try {
    logger.info('Loading configuration')
    Object.assign(configuration, await fs.readJSON('./config.json'))
  } catch (err) {
    try {
      await fs.writeJSON('./config.json', configuration, {spaces: 2})
      logger.warning('Created new configuration')
    } catch (err) {
      logger.severe(`Failed to load or create configuration (${err})`)
      await shutdown()
    }
  }

  logger.info('Binding to port ' + configuration.port)
  app.listen(configuration.port, function() {
    logger.info('Started')
    logger.info('Active generation is ' + gen)
  })
})()

