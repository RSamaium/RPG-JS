import { expressServer } from '@rpgjs/server'
import modules from './modules'
import globalConfig from './config/server'

expressServer(modules, {
    globalConfig,
    basePath: __dirname
})