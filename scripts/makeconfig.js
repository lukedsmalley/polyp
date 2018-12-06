
const crypto = require('crypto')
const fs = require('fs-extra')

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

function getSHA(input) {
  let hash = crypto.createHash('sha256')
  hash.update(input + configuration.salt)
  return hash.digest('base64')
}

;(async function() {
  try {
    console.log('Loading configuration')
    Object.assign(configuration, await fs.readJSON('./config.json'))
  } catch (err) {
    try {
      await fs.writeJSON('./config.json', configuration, {spaces: 2})
      console.log('Created new configuration')
    } catch (err) {
      console.error(`Failed to load or create configuration (${err})`)
      return
    }
  }

  for (let arg of process.argv.slice(2)) configuration.profiles[getSHA(arg)] = {}

  try {
    await fs.writeJSON('./config.json', configuration, {spaces: 2})
    console.log('Updated configuration')
  } catch (err) {
    console.error(`Failed to load or create configuration (${err})`)
  }
})()
.catch(err => console.error(`Unhandled application exception: ${err}`))
