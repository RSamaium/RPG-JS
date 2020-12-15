import { entryPoint } from '@rpgjs/client'
import RPG from './rpg'

document.addEventListener('DOMContentLoaded', function(e) { 
    entryPoint(RPG).start()
})