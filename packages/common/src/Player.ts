import { PendingMove } from '@rpgjs/types'
import { AbstractObject } from './AbstractObject'

export const LiteralDirection = {
    1: 'up',
    2: 'right',
    3: 'down',
    4: 'left'
}

export class RpgCommonPlayer extends AbstractObject {
    events: any[] = []
    layerName: string = ''
    data: any = {}
    pendingMove: PendingMove = []
    inputsTimestamp: {
        [inputName: string]: number
    } = {}

    /** 
    * Display/Hide the GUI attached to this sprite
    * 
    * @prop {boolean} guiDisplay
    * @since 3.0.0-beta.5
    * @memberof RpgSprite
    * */
    guiDisplay: boolean
}

export default AbstractObject