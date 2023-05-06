import main from './main'
import defaultGui from '@rpgjs/default-gui' 
import mobileGui from '@rpgjs/mobile-gui'
import gamepad from '@rpgjs/gamepad'
import emotionBubblesPlugin from '@rpgjs/plugin-emotion-bubbles'
import save from '@rpgjs/save'

export default [
    main,
    gamepad,
    defaultGui,
    //mobileGui,
    emotionBubblesPlugin,
    save
    //chat,
    //title
]