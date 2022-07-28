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
const cwd = process.cwd()

const getAllFiles = function(dirPath, exclude, arrayOfFiles = []) {
  files = fs.readdirSync(dirPath)

  files.forEach(function(file) {
    if (exclude && exclude(file)) return
    if (fs.statSync(dirPath + "/" + file).isDirectory()) {
      arrayOfFiles = getAllFiles(dirPath + "/" + file, exclude, arrayOfFiles)
    } else {
      arrayOfFiles.push(path.join(dirPath, "/", file))
    }
  })

  return arrayOfFiles
}

const toAssetsDirectory = (srcPath, side) => {
  return fs.promises.copyFile(srcPath, `${cwd}/dist/${type == 'mmorpg' ? side : 'standalone'}/assets/${path.basename(srcPath)}`)
}

const createDirectories = async () => {
  await fs.promises.mkdir(`${cwd}/dist/${type == 'mmorpg' ? 'server' : 'standalone'}/assets`, { recursive: true })
  await fs.promises.mkdir(`${cwd}/dist/${type == 'mmorpg' ? 'client' : 'standalone'}/assets`, { recursive: true })
}

const copyFiles = (_path) => {
  const ext = path.extname(_path)
  if (['.png', '.ogg', '.jpg', '.jpeg', '.gif', '.mp3'].includes(ext))  {
    toAssetsDirectory(_path, 'client')
  }
  if (['.tsx', '.tmx'].includes(ext))  {
    toAssetsDirectory(_path, 'server')
  }
}

const exludesDirectory = (path) =>  {
  return path.includes('node_modules') || path.includes('dist')
}

const watchFiles = () => {
  const watcher = chokidar.watch(cwd, {
    ignored: exludesDirectory
  })
  
  watcher.on('all', (event, _path) => {
    if (event == 'add' || event == 'change') {
      copyFiles(_path)
    }
  })
}

const buildFiles = async () => {
  getAllFiles(cwd, exludesDirectory).forEach(copyFiles)
}

const openWebpackConfigFile = async (type) => {
  let webpackConfig
  try {
    const configFile = `${cwd}/webpack.config.js`
    fs.accessSync(configFile, fs.constants.R_OK | fs.constants.W_OK)
    webpackConfig = require(configFile)
  } catch (err) {
    if (err.code != 'ENOENT') console.log(err)
  }

  await createDirectories()
  
  if (type == 'watch') {
    watchFiles()
  }
  else {
    buildFiles()
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
  .command('dev', 'Run webpack in local development', async (yargs) => {
    console.log('Webpack starting...')
    const compiler = webpack(await openWebpackConfigFile('watch'))
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
    const compiler = webpack(await openWebpackConfigFile('build'))
    compiler.run((err) => {
      if (err) {
        console.error(err)
        return
      }
      console.log('The game was built in the "dist" directory')
    })
  })
  .argv