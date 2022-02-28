import main from './main'
import defaultGui from '@rpgjs/default-gui' 
import mobileGui from '@rpgjs/mobile-gui'
import monitoring from '@rpgjs/monitoring'
import gamepad from '@rpgjs/gamepad'
import emotionBubblesPlugin from '@rpgjs/plugin-emotion-bubbles'
import plugin from 'rpgjs-plugin-template'

export default [
    gamepad,
    main,
    defaultGui,
    //mobileGui,
    emotionBubblesPlugin,
    monitoring,
    plugin
]
