import main from './main'
import defaultGui from '@rpgjs/default-gui' 
import mobileGui from '@rpgjs/mobile-gui'
import gamepad from '@rpgjs/gamepad'
import emotionBubblesPlugin from '@rpgjs/plugin-emotion-bubbles'

export default [
    main,
    gamepad,
    defaultGui,
    //mobileGui,
    emotionBubblesPlugin,
    //chat,
    //title
]