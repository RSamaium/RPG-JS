import { Direction, PlayerType, RpgCommonPlayer } from "@rpgjs/common"
import { map, filter } from "rxjs/operators"
import { log } from "../Logger"
import { Scene } from "../Scene/Scene"
import { RpgSprite } from "../Sprite/Player"
import { ColorComponent } from "./ColorComponent"
import { TextComponent } from "./TextComponent"

export interface IComponent {
    id: string,
    value: any
}

export class RpgComponent extends PIXI.Container {
    /** @internal */
    tilesOverlay: any
    /** @internal */
    h: number = 1
    /** @internal */
    w: number = 1
    protected _x: number = 0
    protected _y: number = 0
    protected teleported: number = 0
    protected map: string = ''
    protected z: number = 0
    protected fixed: boolean = false
    private components: IComponent[] = []
    private registerComponents: Map<string, any> = new Map()

    constructor(private data: any, protected scene: Scene) {
        super()
        this.setPosition(false)
        this.registerComponents.set(RpgSprite.id, RpgSprite)
        this.registerComponents.set(TextComponent.id, TextComponent)
        this.registerComponents.set(ColorComponent.id, ColorComponent)
        this.scene.game.objects
            .pipe(
                map(object => object[data.id]?.paramsChanged),
                filter(object => {
                    return object && object.components && object.components.length
                })
            )
            .subscribe((val) => {
                this.updateComponents(val)
            })

    }

     /** 
     * To know if the sprite is a player
     * 
     * @prop {boolean} isPlayer
     * @readonly
     * @memberof RpgSprite
     * */
    get isPlayer(): boolean {
        return this.data.type == PlayerType.Player
    }

    /** 
     * To know if the sprite is an event
     * 
     * @prop {boolean} isEvent
     * @readonly
     * @memberof RpgSprite
     * */
    get isEvent(): boolean {
        return this.data.type == PlayerType.Event
    }

    /** 
     * To know if the sprite is a shape
     * 
     * @prop {boolean} isShape
     * @since 3.0.0-rc
     * @readonly
     * @memberof RpgSprite
     * */
     get isShape(): boolean {
        return this.data.type == PlayerType.Shape
    }

    /** 
     * To know if the sprite is the sprite controlled by the player
     * 
     * @prop {boolean} isCurrentPlayer
     * @readonly
     * @memberof RpgSprite
     * */
    get isCurrentPlayer(): boolean {
        return this.data.playerId === this.scene.game.playerId
    }

    /** 
     * Retrieves the logic of the sprite
     * 
     * @prop {RpgSpriteLogic} logic
     * @readonly
     * @since 3.0.0-beta.4
     * @memberof RpgSprite
     * */
    get logic(): RpgCommonPlayer | null {
        return this.scene.game.world.getObject(this.data.playerId)
    }
    
    get guiDisplay(): boolean {
        return (this.logic as RpgCommonPlayer).guiDisplay
    }

    set guiDisplay(val: boolean) {
        (this.logic as RpgCommonPlayer).guiDisplay = val
    }

    setPosition(smooth: boolean = true) {
        const { position, hitbox } = this.data
        if (this.isShape) {
            this.w = hitbox?.w
            this.h = hitbox?.h 
            this._x = Math.floor(hitbox.pos.x)
            this._y = Math.floor(hitbox.pos.y)
        }
        else {
            this._x =  Math.floor(position?.x ?? 0)
            this._y =  Math.floor(position?.y ?? 0)
            this.z =  Math.floor(position?.z ?? 0)
        }
        if (!smooth) {
            this.x = this._x
            this.y = this._y
        }
    }

    update(obj: any): { moving: boolean } {
        const { speed, teleported, map, fixed } = obj
        this.data = obj
        this.setPosition()

        let moving = false

        if (!fixed) {
            if (teleported != this.teleported || map != this.map) {
                this.x = this._x
                this.y = this._y
                this.teleported = teleported
                this.map = map
            }

            this.parent.parent.zIndex = this._y
     
            obj.posX = this._x
            obj.posY = this._y
    
            if (this._x > this.x) {
                this.x += Math.min(speed, this._x - this.x)
                moving = true
            }
    
            if (this._x < this.x) {
                this.x -= Math.min(speed, this.x - this._x)
                moving = true
            }
    
            if (this._y > this.y) {
                this.y += Math.min(speed, this._y - this.y)
                moving = true
            }
    
            if (this._y < this.y) {
                this.y -= Math.min(speed, this.y - this._y)
                moving = true
            }
        }

        this.callMethodInComponents('update', [obj, { moving }])
        this.onUpdate(obj)

        return {
            moving
        }
    }

    showAnimation(graphic: string | string[], animationName: string) {
        return this.callMethodInComponents('showAnimation', [graphic, animationName])
    }

    private callMethodInComponents(name: string, params: any[]) {
        for (let component of this.children) {
            if (component[name]) component[name](...params)
        }
    }

    private updateComponents(object: any) {
        const components: IComponent[] = object.components
        this.removeChildren()
        for (let component of components) {
            const compClass = this.registerComponents.get(component.id)
            if (!compClass) {
                throw log(`Impossible to find ${component.id} component`)
            }
            this.addChild(new compClass(this, component.value))
        }
        this.components = components
    }

    // Hooks
    onInit() {}
    onUpdate(obj) {}
    onMove() {}
    onChanges(data, old) { }
}