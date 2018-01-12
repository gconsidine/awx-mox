#!/usr/bin/env node

const program = require('commander')
const util = require('./lib/util')
const defaults = require('./lib/defaults')

const log = util.log
const run = util.run
const api = util.api

program
  .option('-u, --user <user>', 'Username')
  .option('-e, --email <email>', 'Email')
  .option('-p, --password <password>', 'Password')
  .option('-l, --log-level <logLevel>', 'Set the log level (e.g. 1)', parseInt)
  .option('-r, --role <role>', 'Set the role ID for the user', parseInt)
  .option('-o, --organization <organization>', 'Create an organization for the user')
  .option('-c, --credential <credential>', 'Create a machine credential for the user')
  .parse(process.argv);

const action = program.args[0]

const user = program.user || defaults.USER
const email = program.email || defaults.EMAIL
const password = program.password || defaults.PASSWORD
const logLevel = program.logLevel === null ? defaults.LOG_LEVEL : program.logLevel
const organization = program.organization || defaults.ORGANIZATION
const credential = program.credential || defaults.CREDENTIAL
const role = program.role === null ? defaults.ROLE_ID : program.role

log.level = logLevel

switch (action) {
  case 'credential':
    createCredential()
    break
  case 'organization':
    createOrganization()
    break
  case 'role':
    setRole()
    break
  case 'create':
    create()
    break
  default:
    create()
      .then(setRole)
      .then(createOrganization)
      .then(createCredential)
}

function create () {
  return run('docker', [
      'exec',
      'tools_awx_1',
      'awx-manage',
      'createsuperuser',
      '--noinput',
      `--username=${user}`,
      `--email=${email}`
    ])
    .then(() => run('docker', [
      'exec',
      'tools_awx_1',
      'awx-manage',
      'update_password',
      `--username=${user}`,
      `--password=${password}`
    ]))
    .then(res => {
      log.info(1, '[X] User')
    })
    .catch(err => {
      log.error(1, '[ ] User')
    })
}

function setRole () {
  return api.signIn(user, password)
    .then(() => api.post(`/users/${api.user.id}/roles/`, {
      id: 4
    }))
    .then(() => {
      log.info(1, '[X] Role')
    })
    .catch(() => {
      log.error(1, '[ ] Role')
    })
}

function createOrganization () {
  return api.signIn(user, password)
    .then(() => api.post('/organizations/', {
      name: organization
    }))
    .then(res => api.post(`/organizations/${res.data.id}/users/`, {
      id: api.user.id
    }))
    .then(() => {
      log.info(1, '[X] Organization')
    })
    .catch(err => {
      log.error(1, '[ ] Organization')
    })
}

function createCredential () {
  return api.signIn(user, password)
    .then(() => api.post('/credentials/', {
      name: credential,
      organization: api.user.related.organizations.id,
      credential_type: defaults.CREDENTIAL_TYPE,
      user: api.user.id
    }))
    .then(() => {
      log.info(1, '[X] Credential')
    })
    .catch(err => {
      log.error(1, '[ ] Credential')
    })
}
