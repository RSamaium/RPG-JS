import { entryPoint } from '@rpgjs/standalone'
import modules from './game'

document.addEventListener('DOMContentLoaded', function() { 
    entryPoint(modules).start() 
})
