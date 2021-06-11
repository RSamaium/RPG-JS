import { RpgCommonPlayer } from './Player'
import { Hit, HitObject } from './Hit'

type ShapeObject = HitObject & {
    onIn?(player: RpgCommonPlayer)
    onOut?(player: RpgCommonPlayer)
}

export class Shape  {
    hitbox: any
    properties: any = {}
    type: string = 'box'
    name: string = ''
    private playersIn: {
        [playerid: string]: boolean
    } = {}
    private onIn: (player: RpgCommonPlayer) => void
    private onOut: (player: RpgCommonPlayer) => void
    
    constructor(obj: ShapeObject) {
        this.set(obj)
    }

    isEvent(): boolean {
        return this.type == 'event'
    }

    set(obj: ShapeObject) {
        const hit = Hit.getHitbox(obj)
        Object.assign(this, hit)
    }

    in(player: RpgCommonPlayer): boolean {
        if (!this.playerIsIn(player)) {
            this.playersIn[player.id] = true
            player.inShapes[this.name] = this
            player.execMethod('onInShape', [this])
            player.execMethod('onIn', [player], this)
            return true
        }
        return false
    }

    out(player: RpgCommonPlayer): boolean {
        if (this.playerIsIn(player)) {
            delete this.playersIn[player.id]
            delete player.inShapes[this.name]
            player.execMethod('onOutShape', [this])
            player.execMethod('onOut', [player], this)
            return true
        }
        return false
    }

    playerIsIn(player: RpgCommonPlayer): boolean {
        return !!this.playersIn[player.id]
    }

    isShapePosition(): boolean {
        return !this.hitbox.w
    }
}