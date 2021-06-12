#!/usr/bin/env node

const yargs = require('yargs/yargs')
const { hideBin } = require('yargs/helpers')
const generateModule = require('./module')

yargs(hideBin(process.argv))
  .command('generate [type] [directory_name]', 'Generate', (yargs) => {
    return yargs
      .positional('type', {
        describe: 'Define the type of file to be generated (that module currently)'
      })
      .positional('directory_name', {
        describe: 'the name of the directory'
      })
  }, (argv) => {
    const { directory_name: directory, type } = argv
    if (!type) {
      console.log('Specify the type of file to generate (example: module)')
      return
    }
    if (!directory) {
      console.log('Give the name of the directory to generate (example: my-system)')
      return
    }
    generateModule(directory)
  })
  .argv