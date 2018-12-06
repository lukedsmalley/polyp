
const chalk = require('chalk')
const fs = require('fs-extra')

const levels = {
  info: chalk.green,
  warning: chalk.yellow,
  severe: chalk.red,
  debug: chalk.magenta
}

let adapters = [writeTTY]
let inception = (new Date).getTime()
let stream = null

function writeAll(entry) {
  adapters.forEach(adapter => adapter(entry))
}

function writeTTY(entry) {
  console.log(`${chalk.blue('polyp')} ${levels[entry.level](entry.level)} ${entry.message}`)
}

function writeFile(entry) {
  stream.write(JSON.stringify(entry) + '\n')
}

async function publishFile() {
  stream = fs.createWriteStream(`./logs/${inception}.log`, {flags: 'a'})
  stream.once('close', publishFile)
  stream.on('error', err => debug(`Log file writer failed due to ${err}`))
}

function unpublishFile() {
  stream.off('close', publishFile)
  return new Promise(function(resolve, reject) {
    stream.end(err => {
      if (err) reject(err)
      else resolve()
    })
  })
}

function log(level, message) {
  let time = (new Date).getTime()
  let entry = {level, time, message}
  writeAll(entry)
}

let info = message => log('info', message)
let warning = message => log('warning', message)
let severe = message => log('severe', message)

let debug = message => writeTTY({level: 'debug', message})

async function start() {
  try {
    await fs.mkdirs('./logs')
    //let logs = await fs.readdir('./logs')
    //if (logs.length > 31) {
    //  await fs.remove() //TODO: FINISH THIS CLEANUP ROUTINE
    //}
  } catch (err) {
    debug(`Failed to prepare log directory due to ${err}`)
    return
  }

  try {
    await publishFile()
    adapters.push(writeFile)
  } catch (err) {
    debug(`Failed to publish log file due to ${err}`)
  }
}

async function stop() {
  try {
    await unpublishFile()
  } catch (err) {
    debug('logger', `Failed to flush log file due to ${err}`)
  }
}

module.exports = {
  start, stop, info, warning, severe, debug
}