import { RpgCommonPlayer } from './Player'
import { Hit, HitObject } from './Hit'

type ShapeObject = HitObject & {
    onIn?(player: RpgCommonPlayer)
    onOut?(player: RpgCommonPlayer)
}

export class RpgShape  {
    hitbox: any
    properties: any = {}
    type: string = 'box'
    name: string = ''
    private playersIn: {
        [playerid: string]: boolean
    } = {}
    private onIn: (player: RpgCommonPlayer) => void
    private onOut: (player: RpgCommonPlayer) => void
    clientContainer: any = null
    
    constructor(obj: ShapeObject) {
        this.set(obj)
    }

    private setPos(type: string, val: number) {
        if (this.isShapePosition()) {
            this.hitbox[type] = val
        }
        else {
            this.hitbox.pos[type] = val
        }
        if (this.clientContainer) this.clientContainer[type] = val
    }

    get x(): number {
        return this.hitbox.x || this.hitbox.pos.x
    }

    set x(val: number) {
        this.setPos('x', val)
    }

    get y(): number {
        return this.hitbox.y || this.hitbox.pos.y
    }

    set y(val: number) {
        this.setPos('y', val)
    }

    isEvent(): boolean {
        return this.type == 'event'
    }

    set(obj: ShapeObject) {
        const hit = Hit.getHitbox(obj)
        Object.assign(this, hit)
        this.x = obj.x
        this.y = obj.y
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