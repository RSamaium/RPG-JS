import { Direction, Utils, RpgPlugin, HookClient, RpgCommonPlayer } from '@rpgjs/common'
import { spritesheets } from './Spritesheets'
import { Animation } from '../Effects/Animation'
import { Animation as AnimationEnum } from '../Effects/AnimationCharacter'
import { RpgComponent } from '../Components/Component'

const { capitalize } = Utils

export default class Character extends PIXI.Sprite {
    static readonly id: string = 'graphic'

    private spritesheet: any
    private playStandardAnimation: boolean = true
    public animation: Animation
    private objSaved: object = {}
    private direction: number = 0
    private data: any = {}
    
     /** @internal */
     h: number = 1
     /** @internal */
     w: number = 1
    
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

    constructor(private component: RpgComponent, private graphic: string) {
        super()
        this.data = component.logic
        this.setGraphic(graphic)
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
    showAnimation(graphic: string | string[], animationName: string) {
        const refreshAnimation = (graphic: string) => {
            this.removeChild(this.animation)
            this.animation = new Animation(graphic)
            this.addChild(this.animation)
            this.setAnimationAnchor()
        }
        const memoryGraphic = this.graphic
        let graphicId: string = ''

        if (Utils.isArray(graphic)) {
            graphicId = (graphic as string[]).find(id => id == this.graphic) as string
        }
        else {
            graphicId = graphic as string
        }

        refreshAnimation(graphicId)
        
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
    update(obj, options: any = {}): any {
        const { graphic, direction } = obj
        const { moving } = options
        this.data = obj
        this.direction = direction
        if (this.anim) this.anim.update()
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

}