
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
  console.log(`${chalk.blue(entry.scope)} ${levels[entry.level](entry.level)} ${entry.message}`)
}

function writeDebug(scope, message) {
  writeTTY({level: 'debug', scope, message})
}

function writeFile(entry) {
  stream.write(JSON.stringify(entry) + '\n')
}

async function publishFile() {
  stream = fs.createWriteStream(`./logs/${inception}.log`, {flags: 'a'})
  stream.once('close', publishFile)
  stream.on('error', err => writeDebug('logger', `Log file writer failed due to ${err}`))
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

class Logger {
  constructor(scope) {
    this.scope = scope
  }

  log(level, message) {
    let time = (new Date).getTime()
    let entry = {level, time, scope: this.scope, message}
    writeAll(entry)
  }

  info(message) { this.log('info', message) }
  warning(message) { this.log('warning', message) }
  severe(message) { this.log('severe', message) }

  debug(message) {
    writeDebug(this.scope, message)
  }
}

Logger.start = async function() {
  try {
    await fs.mkdirs('./logs')
    //let logs = await fs.readdir('./logs')
    //if (logs.length > 31) {
      //await fs.remove() //TODO: FINISH THIS CLEANUP ROUTINE
    //}
  } catch (err) {
    writeDebug('logger', `Failed to prepare log directory due to ${err}`)
  }

  try {
    await publishFile()
    adapters.push(writeFile)
  } catch (err) {
    writeDebug('logger', `Failed to publish log file due to ${err}`)
  }
}

Logger.stop = async function() {
  try {
    await unpublishFile()
  } catch (err) {
    writeDebug('logger', `Failed to flush log file due to ${err}`)
  }
}

module.exports = Logger