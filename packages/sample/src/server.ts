import { expressServer } from '@rpgjs/server/express'
import modules from './modules'
import globalConfig from './config/server'

expressServer(modules, {
    globalConfig,
    basePath: __dirname,
    envs: import.meta.env
})