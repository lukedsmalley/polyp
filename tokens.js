
let tokens

module.exports = {
  issue
}

function issue(secret, clientId) {
  let time = Date.now()
  let jti = uuid()
  let payload = Object.assign({jti, cid: request.body.clientid}, configuration.common, configuration.profiles[secret])
  for (let stamp of ['exp', 'iat', 'nbf']) if (payload[stamp]) payload[stamp] += time
  response.send(jwt.sign(payload, configuration.privateKey, {algorithm: 'RS256'}))
  tokens.push(payload)
  logger.info(`200 -> ${request.ip}: Issued token for subject ${payload.sub}`)
}