import main from './main'
import starterKit from '@rpgjs/starter-kit'
import defaultGui from '@rpgjs/default-gui' 
import mobileGui from '@rpgjs/mobile-gui'
import monitoring from '@rpgjs/monitoring'
import gamepad from '@rpgjs/gamepad'
import emotionBubblesPlugin from '@rpgjs/plugin-emotion-bubbles'

export default [
    starterKit,
    gamepad,
    main,
    defaultGui,
    mobileGui,
    emotionBubblesPlugin,
    monitoring
]
