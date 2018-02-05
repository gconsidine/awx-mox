#!/usr/bin/env node

const Promise = require('bluebird')
const program = require('commander')
const util = require('./lib/util')
const defaults = require('./lib/defaults')

const log = util.log
const run = util.run
const api = util.api
const wait = util.wait

program
  .option('-u, --user <user>', 'Username')
  .option('-p, --password <password>', 'Password')
  .option('-j, --project <project>', 'Project')
  .option('-i, --inventory <inventory>', 'Inventory')
  .option('-h, --host <host>', 'Host')
  .option('-t, --template <template>', 'Template')
  .option('-l, --log-level <logLevel>', 'Set the log level (e.g. 1)', parseInt)
  .option('-c, --credential <credential>', 'Create a machine credential for the user')
  .parse(process.argv);

const action = program.args[0]

const user = program.user || defaults.USER
const password = program.password || defaults.PASSWORD
const logLevel = !program.logLevel ? defaults.LOG_LEVEL : program.logLevel
const project = program.project || defaults.PROJECT
const inventory = program.inventory || defaults.INVENTORY
const host = program.host || defaults.HOST
const template = program.template || defaults.TEMPLATE
const credential = program.credential || defaults.CREDENTIAL

log.level = logLevel

switch (action) {
  case 'project':
    createProject()
    break
  case 'inventory':
    createInventories()
    break
  case 'host':
    createHosts()
    break
  case 'template':
    createTemplates()
    break
  default:
    createProject()
      .then(createInventories)
      .then(createHosts)
      .then(createTemplates)
}

function createInventories () {
  return createInventory('sm')
    .then(() => createInventory('md'))
    .then(() => createInventory('lg'))
    .then(() => createInventory('xl'))
    .then(() => createInventory('xxl'))
}

function createHosts () {
  return createHost('sm', 5)
    .then(() => createHost('md', 100))
    .then(() => createHost('lg', 500))
    .then(() => createHost('xl', 1000))
    .then(() => createHost('xxl', 10000))
}

function createTemplates () {
  return createTemplate('sm', 0)
    .then(() => createTemplate('sm', 1))
    .then(() => createTemplate('sm', 2))
    .then(() => createTemplate('md', 0))
    .then(() => createTemplate('md', 1))
    .then(() => createTemplate('md', 2))
    .then(() => createTemplate('lg', 0))
    .then(() => createTemplate('lg', 1))
    .then(() => createTemplate('lg', 2))
    .then(() => createTemplate('xl', 0))
    .then(() => createTemplate('xl', 1))
    .then(() => createTemplate('xl', 2))
    .then(() => createTemplate('xxl', 0))
    .then(() => createTemplate('xxl', 1))
    .then(() => createTemplate('xxl', 2))
}

function createProject () {
  return api.signIn(user, password)
    .then(() => api.extendOrganization())
    .then(() => api.get('/projects/', {
      params: { name: project }
    }))
    .then(({ data }) => {
      if (data && data.count > 0) {
        return Promise.resolve()
      }

      return api.post('/projects/', {
        name: project,
        organization: api.user.related.organizations.id,
        scm_type: 'git',
        base_dir: '/projects/',
        scm_url: defaults.PROJECT_SCM_URL,
        scm_update_cache_timeout: 0
      })
      .then(() => {
        log.info(2, '...waiting for sync')

        return wait(defaults.PROJECT_SYNC_TIMEOUT)
      })
    })
    .then(() => {
      log.info(1, '[X] Project')
    })
    .catch(err => {
      log.error(1, '[ ] Project')
      log.error(2, '   ', err)
    })
}

function createInventory (size) {
  const name = `${inventory}-${size}`

  return api.signIn(user, password)
    .then(() => api.extendOrganization())
    .then(() => api.get('/inventories/', {
      params: { name }
    }))
    .then(({ data }) => {
      if (data && data.count > 0) {
        return Promise.resolve()
      }

      return api.post('/inventories/', {
        name,
        organization: api.user.related.organizations.id,
        variables: '---\nansible_connection: local'
      })
    })
    .then(res => {
      log.info(1, `[X] Inventory (${size})`)
    })
    .catch(err => {
      log.error(1, '[ ] Inventory')
      log.error(2, '   ', err)
    })
}

function createHost (size, count) {
  const name = `${inventory}-${size}`

  return api.signIn(user, password)
    .then(() => api.extendOrganization())
    .then(() => api.get('/inventories/', {
      params: { name }
    }))
    .then(({ data }) => {
      if (data && data.results.length === 1) {
        return Promise.resolve(data.results[0])
      }

      throw new Error(`${name} does not exist`)
    })
    .then(res => {
      const url = `/inventories/${res.id}/hosts/`

      return api.get(url)
        .then(({ data }) => {
          const start = data.count
          const names = []

          for (i = start; i < count; i++) {
            names.push(`${host}-${size}-${i}`)
          }

          if (names.length === 0) {
            return Promise.resolve()
          }

          return createHostPromiseChain(url, names)
        })
    })
    .then(res => {
      log.info(1, `[X] Hosts (${size})`)
    })
    .catch(err => {
      log.error(1, '[ ] Inventory')
      log.error(2, '   ', err)
    })
}

function createHostPromiseChain (url, names, i) {
  i = i || 0

  if (i >= names.length) {
    return Promise.resolve()
  }

  return api.post(url, { name: names[i], enabled: true })
    .then(() => {
      log.info(2, `... ${names[i]} created`)

      return wait(defaults.HOST_CREATION_DELAY)
    })
    .catch(err => {
      log.error(2, `... ${names[i]} not created`)

      return wait(defaults.HOST_CREATION_DELAY)
    })
    .then(() => {
      return createHostPromiseChain(url, names, ++i)
    })
}

function createTemplate (size, verbosity) {
  const templateName = `${template}-${size}-${verbosity}`
  const inventoryName = `${inventory}-${size}`

  return api.signIn(user, password)
    .then(() => api.extendOrganization())
    .then(() => api.get('/job_templates/', {
      params: { name: templateName }
    }))
    .then(({ data }) => {
      if (data && data.count > 0) {
        return Promise.resolve()
      }

      return api.get('/inventories/', {
        params: { name: inventoryName }
      })
    })
    .then(({ data }) => {
      if (!data || data.count === 0) {
        return Promise.reject('Inventory does not exist')
      }

      const ids = {
        inventory: data.results[0].id
      }

      return api.get('/projects/', { params: { name: project } })
        .then(({ data }) => {
          if (!data || data.count === 0) {
            return Promise.reject('Project does not exist')
          }

          ids.project = data.results[0].id
        })
        .then(() => api.get('/credentials/', {
          params: {
            name: credential
          }
        }))
        .then(({ data }) => {
          if (!data || data.count === 0) {
            return Promise.reject('Credential does not exist')
          }

          ids.credential = data.results[0].id

          return ids;
        })
    })
    .then(ids => {
      return api.post('/job_templates/', {
        name: templateName,
        job_type: 'run',
        inventory: ids.inventory,
        project: ids.project,
        playbook: 'cat_file.yml',
        credential: ids.credential,
        verbosity: verbosity,
        job_tags: '',
        skip_tags: '',
        allow_callbacks: false,
        forks: 0,
        ask_diff_mode_on_launch: false,
        ask_tags_on_launch:false,
        ask_skip_tags_on_launch: false,
        ask_limit_on_launch: false,
        ask_job_type_on_launch: false,
        ask_verbosity_on_launch: false,
        ask_inventory_on_launch: false,
        ask_variables_on_launch: false,
        ask_credential_on_launch:false,
        vault_credential: null,
        extra_vars: '---\nfile_to_cat: /supervisor.conf',
        survey_enabled: false
      })
    })
    .then(res => {
      log.info(1, `[X] Template (${size}-${verbosity})`)
    })
    .catch(err => {
      log.error(1, '[ ] Template')
      log.error(2, '   ', err)
    })
}
