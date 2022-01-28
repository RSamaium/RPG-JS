import { RpgCommonPlayer } from './Player'
import { Hit, HitObject } from './Hit'

export enum ShapePositioning {
    Default = 'default',
    Center = 'center'
}

type ShapeObject = HitObject & {
    onIn?(player: RpgCommonPlayer)
    onOut?(player: RpgCommonPlayer)
    fixEvent?: RpgCommonPlayer,
    positioning?: ShapePositioning
}

export class RpgShape  {
    _hitbox: any
    private _properties: any = {}
    type: string = 'box'
    /**
    * Get/Set name
    * @title name
    * @prop { string } name
    * @memberof Shape
    */
    name: string = ''
    fixEvent?: RpgCommonPlayer
    private playersIn: {
        [playerid: string]: boolean
    } = {}
    private onIn: (player: RpgCommonPlayer) => void
    private onOut: (player: RpgCommonPlayer) => void
    clientContainer: any = null
    /**
    * Get/Set positioning
    * @title positioning
    * @prop { ShapePositioning } positioning
    * @default default
    * @memberof Shape
    */
    positioning?: ShapePositioning = ShapePositioning.Default
    
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

    get hitbox() {
        if (this.fixEvent) {
            this._hitbox.pos.x = this.fixEvent.position.x
            this._hitbox.pos.y = this.fixEvent.position.y 
            switch (this.positioning) {
                case ShapePositioning.Center:
                    this._hitbox.pos.x -= this._hitbox.w / 2 - this.fixEvent.hitbox.w / 2
                    this._hitbox.pos.y -= this._hitbox.h / 2 - this.fixEvent.hitbox.h / 2
                    break
            }
        }
        return this._hitbox
    }

    set hitbox(val) {
        this._hitbox = val
    }

    /**
    * Get/Set x
    * @title x
    * @prop { number } x
    * @memberof Shape
    */
    get x(): number {
        return this.hitbox.x || this.hitbox.pos.x
    }

    set x(val: number) {
        this.setPos('x', val)
    }

    /**
    * Get/Set y
    * @title y
    * @prop { number } y
    * @memberof Shape
    */
    get y(): number {
        return this.hitbox.y || this.hitbox.pos.y
    }

    set y(val: number) {
        this.setPos('y', val)
    }

    /**
    * Get/Set properties

    * @title Properties
    * @prop { object } Properties
    * @memberof Shape
    */
    get properties() {
        if (this.fixEvent) {
            return { 
                z : this.fixEvent.position.z,
                ...(this._properties || {})
            }
        }
        return this._properties
    }
    
    set properties(val) {
        this._properties = val
    }

    isEvent(): boolean {
        return this.type == 'event'
    }

    set(obj: ShapeObject) {
        const hit = Hit.getHitbox(obj)
        Object.assign(this, hit)
        this.x = obj.x || 0
        this.y = obj.y || 0
        this.positioning = obj.positioning
        this.fixEvent = obj.fixEvent
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

    /**
     * Whether the player is in this shape
     * 
     * @title Player is in this shape ?
     * @method shape.playerIsIn(player)
     * @returns {boolean}
     * @memberof Shape
     */
    playerIsIn(player: RpgCommonPlayer): boolean {
        return !!this.playersIn[player.id]
    }

    isShapePosition(): boolean {
        return !this.hitbox.w
    }

   /**
     * Recover the player with the shape. You must have used the `attachShape()` method on the player
     * 
     * @title Get Player Owner
     * @method shape.getPlayerOwner()
     * @returns {RpgPlayer | undefined}
     * @memberof Shape
     */
    getPlayerOwner(): RpgCommonPlayer | undefined {
        return this.fixEvent
    }
}