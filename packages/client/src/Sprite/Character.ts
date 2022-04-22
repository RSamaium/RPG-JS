import { Direction, Utils, RpgPlugin, HookClient, RpgCommonPlayer } from '@rpgjs/common'
import { spritesheets } from './Spritesheets'
import { Animation } from '../Effects/Animation'
import { Animation as AnimationEnum } from '../Effects/AnimationCharacter';

const { capitalize } = Utils

export default class Character extends PIXI.Sprite {
   
     /** @internal */
    tilesOverlay: any
     /** @internal */
    h: number = 1
     /** @internal */
    w: number = 1
    protected direction: number = 0
    private graphic: string = ''
    private spritesheet: any
    private _x: number = 0
    private _y: number = 0
    public z: number = 0
    private fixed: boolean = false
    private playStandardAnimation: boolean = true
    public animation: Animation
    private objSaved: object = {}
    private teleported: number = 0
    private map: string = ''

    /** @internal */
    anim: Animation

     /** 
     * the direction of the sprite
     * 
     * @prop {Direction} dir
     * @readonly
     * @memberof RpgSprite
     * */
    get dir(): Direction {
        return this.direction
    }

    /** 
     * To know if the sprite is a player
     * 
     * @prop {boolean} isPlayer
     * @readonly
     * @memberof RpgSprite
     * */
    get isPlayer(): boolean {
        return this.data.type == 'player'
    }

    /** 
     * To know if the sprite is an event
     * 
     * @prop {boolean} isEvent
     * @readonly
     * @memberof RpgSprite
     * */
    get isEvent(): boolean {
        return this.data.type == 'event'
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
    get logic(): RpgCommonPlayer {
        return this.scene.game.world.getObject(this.data.playerId)
    }
    
    get guiDisplay(): boolean {
        return this.logic.guiDisplay
    }

    set guiDisplay(val: boolean) {
        this.logic.guiDisplay = val
    }

    constructor(private data: any, protected scene: any) {
        super()
        this.x = data.position.x 
        this.y = data.position.y
        this.fixed = data.fixed
    }

    /**
     * Recover the position according to the graphic
     * Normally, the position is that of the hitbox but, we retrieve the top left corner of the graphic
     * 
     * You can also pass the `middle` value as first parameter to retrieve the positions from the middle of the sprite
     * 
     * @title Get Positions of Graphic
     * @method sprite.getPositionsOfGraphic(align)
     * @param {string} [align] middle
     * @returns { x: number, y: number }
     * @memberof RpgSprite
     */
    getPositionsOfGraphic(align?: string): { x: number, y: number } {
        const isMiddle = align == 'middle'
        return {
            x: this.x - this.w * this.anchor.x + (isMiddle ? this.w / 2 : 0),
            y: this.y - this.h * this.anchor.y + (isMiddle ? this.h / 2 : 0)
        }
    }

    /** @internal */
    showAnimation(graphic: string, animationName: string) {
        const refreshAnimation = (graphic) => {
            this.removeChild(this.animation)
            this.animation = new Animation(graphic)
            this.addChild(this.animation)
            this.setAnimationAnchor()
        }
        const memoryGraphic = this.graphic

        refreshAnimation(graphic)
        
        this.animation.onFinish = () => {
            this.playStandardAnimation = true
            refreshAnimation(memoryGraphic)
            this.update(this.objSaved)
        }

        this.playStandardAnimation = false
        this.playAnimation(animationName)
        return this.animation
    }

    /** @internal */
    setGraphic(graphic) {
        (this.children as Animation[]).forEach((graphic: Animation, index: number) => {
            if (graphic.id == this.graphic) {
                this.removeChildAt(index)
            }
        })
        this.graphic = graphic
        this.spritesheet = spritesheets.get(this.graphic)
        this.animation = new Animation(this.graphic)
        this.addChild(this.animation)
        this.setAnimationAnchor()
    }

    private setAnimationAnchor() {
        this.animation.hitbox = { h: this.data.hHitbox, w: this.data.wHitbox }
        this.animation.applyTransform = (frame, animation, spritesheet) => {
            const { spriteWidth, spriteHeight } = animation
            const prop = 'anchorBySize'
            const currentAnchor = frame[prop] || animation[prop] || spritesheet[prop]
            if (currentAnchor) {
                return {}
            }
            return {
                anchorBySize: [spriteWidth, spriteHeight]
            }
        }
    }

    /** @internal */
    update(obj): any {
        const { graphic, speed, teleported, map } = obj

        if (graphic != this.graphic) {
            this.setGraphic(graphic)
        }

        if (this.anim) this.anim.update()

        let moving = false

        if (!this.fixed) {
            this.z = Math.floor(obj.position.z)
            this._x = Math.floor(obj.position.x)
            this._y = Math.floor(obj.position.y) - this.z

            if (teleported != this.teleported || map != this.map) {
                this.x = this._x
                this.y = this._y
                this.teleported = teleported
                this.map = map
            }

            this.parent.parent.zIndex = this._y
     
            obj.posX = obj.position.x
            obj.posY = obj.position.y
    
            this.direction = obj.direction
            
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

        if (this.animation) this.animation.update()

        if (this.playStandardAnimation) {
            if (moving) {
                RpgPlugin.emit(HookClient.SpriteMove, this)
                this.playAnimation(AnimationEnum.Walk)
            }
            else {
                this.playAnimation(AnimationEnum.Stand)
            }
        }

        this.onUpdate(obj)
        this.objSaved = obj

        return {
            moving,
            instance: this
        }
    }

    /** @internal */
    playAnimation(name: string) {
        const hook = `onCharacter${capitalize(name)}`
        if (!this.spritesheet) return
        if (this.spritesheet[hook]) {
            this.spritesheet[hook](this)
        }
        else if (this.animation.has(name)) {
            this.animation.play(name, [this.dir])
        }
    }

    // Hooks
    onInit() {}
    onUpdate(obj) {}
    onMove() {}
    onChanges(data, old) { }
}