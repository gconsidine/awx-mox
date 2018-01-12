#!/usr/bin/env node

const program = require('commander')
const util = require('./lib/util')
const defaults = require('./lib/defaults')

const log = util.log
const run = util.run
const api = util.api

program
  .option('-p, --project <project>', 'Project')
  .option('-i, --inventory <inventory>', 'Inventory')
  .option('-h, --host <host>', 'Host')
  .option('-t, --template <template>', 'Template')
  .option('-l, --log-level <logLevel>', 'Set the log level (e.g. 1)', parseInt)
  .parse(process.argv);

const action = program.args[0]

const project = program.project || defaults.PROJECT
const inventory = program.inventory || defaults.INVENTORY
const host = program.host || defaults.HOST
const template = program.template || defaults.TEMPLATE

log.level = logLevel

switch (action) {
  case 'project':
    createProject()
    break
  case 'inventory':
    createInventory()
    break
  case 'host':
    createHost()
    break
  case 'template':
    createTemplate()
    break
  default:
    createProject()
      .then(createInventory)
      .then(createHost)
      .then(createTemplate)
}

function createProject () {

}

function createInventory () {

}

function createHost () {

}

function createTemplate () {

}
