import { entryPoint } from '@rpgjs/client'
import io from 'socket.io-client'
import RPG from './rpg'

document.addEventListener('DOMContentLoaded', function(e) { 
    entryPoint(RPG, { io }).start()
})