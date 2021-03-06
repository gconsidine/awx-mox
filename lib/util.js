const path = require('path');
const { spawn } = require('child_process')

const Promise = require('bluebird')
const chalk = require('chalk')
const axios = require('axios');
const https = require('https');

const URL = 'https://localhost:8043/api/v2/';

const awx = axios.create({
    baseURL: URL,
    xsrfHeaderName: 'X-CSRFToken',
    xsrfCookieName: 'csrftoken',
    httpsAgent: new https.Agent({
        rejectUnauthorized: false
    })
})

function run (command, args) {
  return new Promise ((resolve, reject) => {
    command = spawn(command, args)

    command.stdout.on('data', buffer => {
      if (log.level > 1) {
        log.info(buffer)
      }
    })

    command.stderr.on('data', buffer => {
      if (log.level > 1) {
        log.error(buffer)
      }
    })

    command.on('close', code => resolve(code))
  })
}

function wait (time) {
  return new Promise(resolve => {
    setTimeout(() => {
      return resolve()
    }, time)
  })
}

const log = {
  level: 1,
  info (level, ...args) {
    const messages = args.join(' ')

    if (level <= this.level) {
      console.info(chalk.cyan(messages))
    }
  },
  error (level, ...args) {
    const messages = args.join(' ')

    if (level >= this.level) {
      console.error(chalk.red(messages))
    }
  }
}

const api = {
  get: awx.get,
  post: awx.post,
  user: null,
  getCurrentUser () {
    return this.get('me/')
      .then(res => {
        if (this.user) {
          return Promise.resolve()
        }

        this.user = res.data.results[0]
      })
  },
  extendOrganization () {
    if (this.user & this.user.related.organizations.id) {
      return Promise.resolve()
    }

    return this.get(`users/${this.user.id}/organizations/`)
      .then(res => {
        this.user.related.organizations = res.data.results[0]
      })
  },
  signIn (username, password) {
    if (this.user) {
      return Promise.resolve()
    }

    return this.post('authtoken/', {
      username,
      password
    })
    .then(res => {
      awx.defaults.headers.Authorization = `Token ${res.data.token}`

      return this.getCurrentUser()
    })
  }
}

module.exports = {
  run,
  log,
  api,
  wait
}
