#!/usr/bin/env node

const yargs = require('yargs/yargs')
const { hideBin } = require('yargs/helpers')
const generateModule = require('./module')
const webpack = require('webpack')
const webpackDefaultConfig = require('../../index')
const fs = require('fs')

const openWebpackConfigFile = () => {
  const cwd = process.cwd()
  let webpackConfig
  try {
    const configFile = `${cwd}/webpack.config.js`
    fs.accessSync(configFile, fs.constants.R_OK | fs.constants.W_OK)
    webpackConfig = require(configFile)
  } catch (err) {
    if (err.code != 'ENOENT') console.log(err)
  }
  return webpackConfig || webpackDefaultConfig(cwd)
}

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
  .command('dev', 'Run webpack in local development', (yargs) => {
    console.log('Webpack starting...')
    const compiler = webpack(openWebpackConfigFile())
    compiler.watch({
      aggregateTimeout: 300,
      poll: undefined
    }, (err) => {
      if (err) {
        console.error(err)
        return
      }
    })
  })
  .command('build', 'Build for production', (yargs) => {
    console.log('Webpack building...')
    const compiler = webpack(openWebpackConfigFile())
    compiler.run((err) => {
      if (err) {
        console.error(err)
        return
      }
      console.log('The game was built in the "dist" directory')
    })
  })
  .argv