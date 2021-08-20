import { entryPoint } from '@rpgjs/standalone'
import globalConfig from './config/client'
import modules from './modules'

document.addEventListener('DOMContentLoaded', function() { 
    entryPoint(modules, { 
        globalConfig
    }).start() 
})