
const fs = require('fs-extra')

module.exports = {
  load, save
}

async function load() {
  try {
    Object.assign(module.exports, await fs.readJSON('./config.json'))
  } catch (err) {
    await fs.writeJSON('./config.json', module.exports, {spaces: 2})
  }
}

async function save() {
  await fs.writeJSON('./config.json', module.exports, {spaces: 2})
}