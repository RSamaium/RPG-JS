import { PrebuiltGui } from '@rpgjs/common'
import { Gui } from './Gui'
import { RpgPlayer } from '../Player/Player'
import { IGui } from '../Interfaces/Gui'
import { Move } from '../Player/MoveManager'

export enum DialogPosition {
    Top = 'top',
    Bottom = 'bottom',
    Middle = 'middle'
}

export type Choice = { text: string, value: any }

export interface DialogOptions {
    choices?: Choice[],
    position?: DialogPosition,
    fullWidth?: boolean,
    autoClose?: boolean,
    tranparent?: boolean,
    typewriterEffect?: boolean,
    talkWith?: RpgPlayer
}

export class DialogGui extends Gui implements IGui {
    constructor(player: RpgPlayer) {
        super(PrebuiltGui.Dialog, player)
    }

    openDialog(message: string, options: DialogOptions): Promise<any> {
        if (!options.choices) options.choices = []
        if (options.autoClose == undefined) options.autoClose = false
        if (!options.position) options.position = DialogPosition.Bottom
        if (options.fullWidth == undefined) options.fullWidth = true
        if (options.typewriterEffect  == undefined) options.typewriterEffect = true
        const event = options.talkWith
        let memoryDir
        if (event) {
            memoryDir = event.direction
            event.breakRoutes(true)
            event.moveRoutes([ Move.turnTowardPlayer(this.player) ])
        }
        const data = {
            autoClose: options.autoClose,
            position: options.position,
            fullWidth: options.fullWidth,
            typewriterEffect: options.typewriterEffect,
            // remove value property. It is not useful to know this on the client side.
            choices: options.choices.map(choice => ({
                text: choice.text
            }))
        }
        return super.open({
            message,
            ...data
        }, {
            waitingAction: true,
            blockPlayerInput: true
        }).then((val: any) => {
            if (event) {
                event.replayRoutes()
                event.direction = memoryDir
            }
            return val
        })
    }
}