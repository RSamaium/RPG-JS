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
        const hit = Hit.getHitbox(obj)
        Object.assign(this, hit)
    }

    in(player: RpgCommonPlayer): boolean {
        if (!this.playerIsIn(player)) {
            this.playersIn[player.id] = true
            if (this.onIn) this.onIn(player)
            return true
        }
        return false
    }

    out(player: RpgCommonPlayer): boolean {
        if (this.playerIsIn(player)) {
            delete this.playersIn[player.id]
            if (this.onOut) this.onOut(player)
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