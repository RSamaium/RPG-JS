import main from './main'
import defaultGui from '@rpgjs/default-gui' 
import mobileGui from '@rpgjs/mobile-gui'
import monitoring from '@rpgjs/monitoring'
import gamepad from '@rpgjs/gamepad'
import starterKit from '@rpgjs/starter-kit'
import emotionBubblesPlugin from '@rpgjs/plugin-emotion-bubbles'
//import title from '@rpgjs/title-screen'
import chat from '@rpgjs/chat'
import agones from '@rpgjs/agones'

export default [
    main,
    gamepad,
    //starterKit,
    defaultGui,
    //mobileGui,
    emotionBubblesPlugin,
    monitoring, 
    agones
    //chat,
    //title
]
