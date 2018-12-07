
const crypto = require('crypto')
const express = require('express')
const fs = require('fs-extra')
const helmet = require('helmet')
const jwt = require('jsonwebtoken')
const uuid = require('uuid/v1')
const logger = require('./logger')
const {notNull, nonNullProperty} = require('./utilities')

const app = express()
const privateKey, publicKey
const configuration = {
  port: 8080,
  salt: 'a dead sea swim',
  common: {
    iss: 'polyp',
    sub: 'anonymous',
    aud: 'any',
    exp: 3600
  },
  profiles: {}
}
const tokens = []



function checkPrivilege(scope) {
  return function(request, response, next) {
    let auth = request.get('Authorization')
    if (auth && auth.startsWith('Bearer ')) {
      try {
        let token = jwt.verify(auth.substring(7), configuration.publicKey)
        if (!token.aud || token.aud !== 'polyp') throw 'Invalid audience'
        if (!token.exp || token.exp <= Date.now()) throw 'Expired token'
        if (!token.scope || token.scope.indexOf(scope) < 0) throw 'Insufficient scope'
        next()
      } catch (err) {
        response.sendStatus(403)
        logger.severe(`403 -> ${request.ip}: Bad authorization`)
        return
      }
    } else {
      response.sendStatus(403)
      logger.severe(`403 -> ${request.ip}: No authorization`)
    }
  }
}

app.use(helmet())
app.use(express.json())

app.post('/v1/authorize', function(request, response) {
  try {
    let secret = nonNullProperty(request.body, 'secret', 'string')
    let clientId = nonNullProperty(request.body, 'clientId', 'string')
    tokens.issue(secret, clientId, response.send)
  } catch (err) {
    response.sendStatus(403)
    logger.severe(`403 -> ${request.ip}: ${err}`)
  }

  let secret
  if (!request.body.secret || !request.body.clientId) {
    response.sendStatus(403)
    logger.severe(`403 -> ${request.ip}: No secret and/or clientId`)
  } else if (!configuration.profiles.hasOwnProperty(secret = getSHA(request.body.secret))) {
    response.sendStatus(403)
    logger.severe(`403 -> ${request.ip}: Unknown secret`)
  } else {
    let time = Date.now()
    let jti = uuid()
    let payload = Object.assign({jti, cid: request.body.clientid}, configuration.common, configuration.profiles[secret])
    for (let stamp of ['exp', 'iat', 'nbf']) if (payload[stamp]) payload[stamp] += time
    response.send(jwt.sign(payload, configuration.privateKey, {algorithm: 'RS256'}))
    tokens.push(payload)
    logger.info(`200 -> ${request.ip}: Issued token for subject ${payload.sub}`)
  }
})

app.post('/v1/authenticate', function(request, response) {
  if (!request.body.token) {
    response.sendStatus(500)
    logger.severe(`500 -> ${request.ip}: No token`)
    return
  }

  let token
  try {
    token = jwt.verify(request.body.token, configuration.publicKey)
  } catch (err) {
    response.sendStatus(500)
    logger.severe(`500 -> ${request.ip}: Inauthentic token`)
    return
  }

  //Does not verify iat, nbf, exp.

  if (!token.jti || tokens.filter(t => t.jti && t.jti === token.jti).length <= 0) {
    response.sendStatus(500)
    logger.severe(`500 -> ${request.ip}: Token not found`)
    return
  }

  response.sendStatus(200)
  logger.info(`200 -> ${request.ip}: Authenticated token for subject ${token.sub}`)
})

app.post('/v1/register', checkPrivilege('register'), function(request, respones) {
  if (!request.body.secret || !request.body.profile) {
    response.sendStatus(500)
    logger.severe(`500 -> ${request.ip}: No secret and/or profile`)
    return
  }

  configuration.profiles[request.body.secret] = request.body.profile

  try {
    await fs.writeJSONSync('./config.json', configuration, {spaces: 2})
  } catch (err) {
    delete configuration.profiles[request.body.secret]
    response.sendStatus(500)
    logger.severe(`500 -> ${request.ip}: Failed to save config file`)
    return
  }

  response.sendStatus(200)
  logger.info(`200 -> ${request.ip}: Created new profile for secret ${request.body.secret}`)
})

app.use(function(err, request, response, next) {
  logger.severe(`500 -> ${request.ip}: Request to ${request.originalUrl} failed (${err})`)
  response.sendStatus(500)
})

;(async function() {
  function shutdown(signal) {
    return async function() {
      logger.info('Received ' + signal)
      await logger.stop()
      process.exit(0)
    }
  }

  process.once('SIGINT', shutdown('SIGINT'))
  process.once('SIGTERM', shutdown('SIGTERM'))

  await logger.start()

  try {
    logger.info('Loading private key')
    privateKey = await fs.readFile('./id_rsa')
  } catch (err) {
    logger.severe(`Failed to load private key (${err})`)
    await shutdown()
  }

  try {
    logger.info('Loading public key')
    privateKey = await fs.readFile('./id_rsa.pub')
  } catch (err) {
    logger.severe(`Failed to load public key (${err})`)
    await shutdown()
  }

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
  app.listen(configuration.port, () => logger.info('Started'))
})()
.catch(err => logger.severe(`Unhandled application exception: ${err}`))
