#!/usr/bin/env node

const program = require('commander')
const pj = require('./package.json')

program
  .version(pj.version)
  .command('user [action]', 'Add user').alias('u')
  .command('project [action]', 'Add project').alias('p')
  .command('launch [action]', 'Launch a job').alias('j')
  .parse(process.argv)
