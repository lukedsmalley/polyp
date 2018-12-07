
const {createHash} = require('crypto')

module.exports = {
  getSHA, notNull, nonNullProperty
}

function getSHA(input) {
  let hash = createHash('sha256')
  hash.update(input + configuration.salt)
  return hash.digest('base64')
}

function notNull(value, name, type, ctor) {
  if (value === undefined || value === null) throw `Value of '${name}' cannot be null or undefined`
  else if (type && typeof value !== type) throw `Value of '${name}' must be a ${type}`
  else if (ctor && !(value instanceof ctor)) throw `Value of '${name}' must be a ${ctor.name}`
  else return value
}

function nonNullProperty(target, name, type, ctor) {
  let value = target[name]
  if (value === undefined || value === null) throw `Property '${name}' cannot be null or undefined`
  else if (type && typeof value !== type) throw `Property '${name}' must be a ${type}`
  else if (ctor && !(value instanceof ctor)) throw `Property '${name}' must be a ${ctor.name}`
  else return value
}