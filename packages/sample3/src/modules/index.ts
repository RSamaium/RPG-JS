import main from './main'
import defaultGui from '@rpgjs/default-gui' 
import mobileGui from '@rpgjs/mobile-gui'
import monitoring from '@rpgjs/monitoring'
import gamepad from '@rpgjs/gamepad'
import emotionBubblesPlugin from '@rpgjs/plugin-emotion-bubbles'

export default [
    gamepad,
    main,
    defaultGui,
    //mobileGui,
    emotionBubblesPlugin,
    monitoring
]
