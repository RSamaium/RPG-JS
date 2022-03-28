import { entryPoint } from '@rpgjs/client'
import io from 'socket.io-client'
import globalConfig from './config/client'
import modules from './modules'

document.addEventListener('DOMContentLoaded', function(e) { 
    entryPoint(modules, { 
        io,
        globalConfig
    }).start()
})