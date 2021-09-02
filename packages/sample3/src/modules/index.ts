import main from './main'
import starterKit from '@rpgjs/starter-kit'
import defaultGui from '@rpgjs/default-gui' 
import mobileGui from '@rpgjs/mobile-gui'
import chat from '@rpgjs/chat'
import gamepad from '@rpgjs/gamepad'
import save from '@rpgjs/save'

export default [
    starterKit,
    gamepad,
    main,
    defaultGui,
    mobileGui,
    chat,
    save
]
