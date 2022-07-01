import { PlayerType, RpgCommonPlayer } from './Player'
import { Hit, HitObject, HitType } from './Hit'
import { isInstanceOf } from './Utils'
import SAT from 'sat'
import { TiledObjectClass, TiledProperties } from '@rpgjs/tiled'
import { RpgCommonMap } from './Map'

export enum ShapePositioning {
    Default = 'default',
    Center = 'center'
}

type ShapeObject = TiledObjectClass & {
    onIn?(player: RpgCommonPlayer)
    onOut?(player: RpgCommonPlayer)
    fixEvent?: RpgCommonPlayer,
    positioning?: ShapePositioning
}

export class RpgShape extends TiledObjectClass {
    _hitbox: any
    private _properties: any = {}
    type: string = HitType.Box
    class: string = ''
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
    components: any[] = []
    
    constructor(obj: ShapeObject) {
        super()
        Reflect.deleteProperty(obj, 'id')
        this.set(obj)
    }

    private setPos(type: string, val: number) {
        if (this.isShapePosition()) {
            this.hitbox[type] = val
        }
        else {
            this.hitbox.pos[type] = val
        }
    }

    // alias
    get id(): any {
        return this.name
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
    * Get/Set width
    * @title width
    * @prop { number } width
    * @since 3.0.0-beta.5
    * @memberof Shape
    */
    get width(): number {
        return this.hitbox.w || 0
    }

    set width(val: number) {
        this.setPos('w', val)
    }

    /**
    * Get/Set height
    * @title height
    * @prop { number } height
    * @since 3.0.0-beta.5
    * @memberof Shape
    */
    get height(): number {
        return this.hitbox.h || 0
    }

    set height(val: number) {
        this.setPos('h', val)
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

    // alias
    get position() {
        return {
            x: this.x,
            y: this.y
        }
    }

    /**
    * Get/Set properties

    * @title Properties
    * @prop { object } Properties
    * @memberof Shape
    */

    isEvent(): boolean {
        return this.type == PlayerType.Event
    }

    set(obj: ShapeObject) {
        const hit = Hit.getHitbox(obj)
        Object.assign(this, hit)
        Object.assign(this, obj)
        const findPoint = (prop: string, isMin: boolean) => {
            return this.hitbox.points.sort((a, b) => isMin ? a[prop] - b[prop] : b[prop] - a[prop])[0][prop]
        }
        if (this.type == HitType.Polygon) {
            this.hitbox.minX = findPoint('x', true)
            this.hitbox.maxX = findPoint('x', false)
            this.hitbox.minY = findPoint('y', true)
            this.hitbox.maxY = findPoint('y', false)
        }
        this.positioning = obj.positioning
        this.fixEvent = obj.fixEvent
        this.setComponent()
    }

    setComponent() {
        const color = this.getProperty<string>('color')
        const image = this.getProperty<string>('image')
        if (color) {
            this.components = [{ id: 'color', value: color }]
            return
        }
        if (image) {
            this.components = [{ id: 'image', value: image }]
            return
        }
        if (this.text) {
            this.components = [{ id: 'text', value: this.text.text }]
            return
        }
        if (this.gid) {
            this.components = [{ id: 'tile', value: this.gid }]
            return
        }
    }

    getType() {
        return this.class || this.type
    }

    async in(player: RpgCommonPlayer): Promise<boolean> {
        if (!this.playerIsIn(player)) {
            this.playersIn[player.id] = true
            player.inShapes[this.name] = this
            await player.execMethod('onInShape', [this])
            await player.execMethod('onIn', [player], this)
            return true
        }
        return false
    }

    async out(player: RpgCommonPlayer): Promise<boolean> {
        if (this.playerIsIn(player)) {
            delete this.playersIn[player.id]
            delete player.inShapes[this.name]
            await player.execMethod('onOutShape', [this])
            await player.execMethod('onOut', [player], this)
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
        /*return !isInstanceOf(this.hitbox, SAT.Polygon) 
            && !isInstanceOf(this.hitbox, SAT.Circle)
            && !isInstanceOf(this.hitbox, SAT.Box)*/
        return !this.type
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

    /**
     * We get the rectangle of a shape (box, circle and polygon). We use in the grid system to recover a shape.
     * Generally we add a margin (size of a tile) to detect if the player enters or leaves a shape
     * @param margin 
     * @returns { minX: number, minY: number, maxX: number, maxY: number }
     */
    getSizeBox(margin: number = 0): { minX: number, minY: number, maxX: number, maxY: number }  {
        if (this.type == HitType.Circle) {
            const radius = this.hitbox.r
            return {
                minX: this.x - radius - margin,
                maxX: this.x + radius + margin,
                minY: this.y - radius - margin,
                maxY: this.y + radius + margin
            }
        }
        if (this.type == HitType.Polygon) {
            return {
                minX: this.x + this.hitbox.minX - margin,
                maxX: this.x + this.hitbox.maxX + margin,
                minY: this.y + this.hitbox.minY - margin,
                maxY: this.y + this.hitbox.maxY + margin
            }
        }
        return {
            minX: this.x - margin,
            maxX: this.x + this.width + margin,
            minY: this.y - margin,
            maxY: this.y + this.height + margin
        }
    }
}