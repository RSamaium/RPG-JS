import { entryPoint } from '@rpgjs/standalone'
import globalConfigClient from './config/client'
import globalConfigServer from './config/server'
import modules from './modules'

document.addEventListener('DOMContentLoaded', function() { 
    entryPoint(modules, { 
        globalConfigClient,
        globalConfigServer
    }).start() 
})