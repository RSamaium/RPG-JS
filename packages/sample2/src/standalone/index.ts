import { entryPoint } from '@rpgjs/standalone'
import RPG_Server from '../server/rpg'
import RPG_Client from '../client/rpg'

document.addEventListener('DOMContentLoaded', function() { 
    entryPoint(RPG_Client, RPG_Server).start()
})
