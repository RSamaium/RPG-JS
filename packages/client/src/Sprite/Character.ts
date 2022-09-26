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
    private data: any = {}
    
     /** @internal */
     h: number = 1
     /** @internal */
     w: number = 1
    
    /** @internal */
    anim: Animation

    constructor(private component: RpgComponent, private graphic: string) {
        super()
        this.data = component.logic
        this.setGraphic(graphic)
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
    update(obj, options: any = {}, deltaRatio: number = 1): {
        moving: boolean
        instance: Character
    } {
        const { moving } = options
        this.data = obj
        if (this.anim) this.anim.update(deltaRatio)
        if (this.animation) this.animation.update(deltaRatio)

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
            this.animation.play(name, [this.data.direction])
        }
    }

}