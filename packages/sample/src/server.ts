import { expressServer } from '@rpgjs/server/lib/express/server' // Todo
import modules from './modules'
import globalConfig from './config/server'

expressServer(modules, {
    globalConfig,
    basePath: __dirname
})