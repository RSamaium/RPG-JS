#!/usr/bin/env node

const yargs = require('yargs/yargs')
const { hideBin } = require('yargs/helpers')
const generateModule = require('./module')
const webpack = require('webpack')
const webpackDefaultConfig = require('../../index')
const fs = require('fs')
const chokidar = require('chokidar')
const path = require('path')

const type = process.env.RPG_TYPE || 'mmorpg'

const openWebpackConfigFile = async () => {
  const cwd = process.cwd()
  let webpackConfig
  try {
    const configFile = `${cwd}/webpack.config.js`
    fs.accessSync(configFile, fs.constants.R_OK | fs.constants.W_OK)
    webpackConfig = require(configFile)
  } catch (err) {
    if (err.code != 'ENOENT') console.log(err)
  }

  await fs.promises.mkdir(`${cwd}/dist/${type == 'mmorpg' ? 'server' : 'standalone'}/assets`, { recursive: true })
  await fs.promises.mkdir(`${cwd}/dist/${type == 'mmorpg' ? 'client' : 'standalone'}/assets`, { recursive: true })

  const watcher = chokidar.watch(cwd, {
    ignored: (path) => {
      return path.includes('node_modules') || path.includes('dist')
    }
  });

  const toAssetsDirectory = (srcPath, side) => {
    fs.promises.copyFile(srcPath, `${cwd}/dist/${type == 'mmorpg' ? side : 'standalone'}/assets/${path.basename(srcPath)}`)
  }
  
  watcher.on('all', (event, _path) => {
    if (event == 'add' || event == 'change') {
        const ext = path.extname(_path)
        if (['.png', '.ogg', '.jpg', '.jpeg', '.gif', '.mp3'].includes(ext))  {
          toAssetsDirectory(_path, 'client')
        }
        if (['.tsx', '.tmx'].includes(ext))  {
          toAssetsDirectory(_path, 'server')
        }
    }
  })

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
  .command('dev', 'Run webpack in local development', async (yargs) => {
    console.log('Webpack starting...')
    const compiler = webpack(await openWebpackConfigFile())
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
  .command('build', 'Build for production', async (yargs) => {
    console.log('Webpack building...')
    const compiler = webpack(await openWebpackConfigFile())
    compiler.run((err) => {
      if (err) {
        console.error(err)
        return
      }
      console.log('The game was built in the "dist" directory')
    })
  })
  .argv