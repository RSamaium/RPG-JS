import * as PIXI from 'pixi.js'
import { KeyboardControls, GameEngine } from 'lance-gg'
import Character from '../Sprite/Character'
import { Animation } from '../Effects/Animation'

export class Scene {
   
    protected objects: Map<string, any> = new Map()
    protected loader = PIXI.Loader.shared
    private controls: KeyboardControls
    private animations: Animation[] = []
    inputs: any

    constructor(protected game: GameEngine<any>) {
        this.setInput(this.inputs)
    }

    /**
     * Assign custom inputs to the scene
     * 
     * The object is the following:
     * 
     * ```ts 
     * import { RpgSceneMap } from '@rpgjs/client'
     * 
     * export class SceneMap extends RpgSceneMap {
     *      onInit() {
     *          this.setInputs()
     *      }
     * }
     * ```
     * 
     * @title Set Inputs
     * @method scene.setInput(object)
     * @param {object} object
     * @memberof RpgScene
     */
    setInput(inputs) {
        const clientEngine = this.game.clientEngine
        this.controls = new KeyboardControls(clientEngine, clientEngine.eventEmitter)
        if (!inputs) return
        for (let input in inputs) {
            const option = inputs[input]
            const { method } = option
            if (method) {
                if (!this[method]) throw new Error(`"${method}" method does not exist on the "${input}" input`)
                option.method = this[method].bind(this)
            }
            this.controls.bindKey(input, option.action || input, option)
        }
    }

    private triggerSpriteChanges(logic, sprite, moving: boolean) {
        if (this.onUpdateObject) this.onUpdateObject(logic, sprite, moving)
        if (sprite['onChanges'] && logic.paramsChanged) {
            sprite['onChanges'](logic.paramsChanged, logic.prevParamsChanged)
            logic.paramsChanged = null
        }
    }

    draw(t, dt) {
        const logicObjects = { ...this.game.world.objects, ...this.game.events }
        const renderObjects = this.objects
        const sizeLogic = Object.values(logicObjects).length
        for (let key in logicObjects) {
            const val = logicObjects[key]
            if (!renderObjects.has(key)) {
                const sprite = this.addObject(val, key)
                this.triggerSpriteChanges(val, sprite, true)
            }
            else {
                const object = renderObjects.get(key)
                if (!object.update) return
                const ret = object.update(val, t, dt)
                this.triggerSpriteChanges(val, object, ret.moving)
            }
        }
        if (sizeLogic < renderObjects.size) {
            renderObjects.forEach((val, key) => {
                if (!logicObjects[key]) {
                    this.removeObject(key)
                }
            })
        }
        for (let animation of this.animations) {
            animation.update()
        }
        this.onDraw(t, dt)
    }

    emitKeyDown() {
        const event: any = new Event('keydown')
        event.keyCode = 39
        this.controls.onKeyChange(event, true)
    }

    emitKeyUp() {
        const event: any = new Event('keyup')
        event.keyCode = 39
        this.controls.onKeyChange(event, false)
    }

    /**
     * Stop listening to the inputs. Pressing a key won't do anything
     * 
     * @title Stop Inputs
     * @method scene.stopInputs()
     * @returns {void}
     * @memberof RpgScene
     */
    stopInputs() {
        this.controls.stop = true
    }

    /**
     * Listen to the inputs again
     * 
     * @title Listen Inputs
     * @method scene.listenInputs()
     * @returns {void}
     * @memberof RpgScene
     */
    listenInputs() {
        this.controls.stop = false
    }

    onUpdateObject(logic, sprite: Character, moving: boolean): any {}

    addObject(obj, id) {
        const sprite = new PIXI.Container()
        this.objects.set(id, sprite)
    }

    removeObject(id) {
        const sprite =  this.objects.get(id)
        if (sprite) {
            this.objects.delete(id)
            sprite.destroy()
        }
    }

    /**
     * Display an animation on the scene
     * 
     * The object is the following:
     * * `graphic`: Spritesheet id
     * * `animationName`: The name of the animation
     * * `attachTo`: Define a sprite. The animation will follow this sprite (optional)
     * * `x`: Position X (0 by default)
     * * `y`: Position Y (0 by default)
     * * `loop`: Display the animation in a loop (false by default)
     * 
     * ```ts 
     * import { RpgSceneMap } from '@rpgjs/client'
     * 
     * export class SceneMap extends RpgSceneMap {
     *      onLoad() {
     *          const animation = this.showAnimation({
     *              graphic: 'my-spritesheet',
     *              animationName: 'my-anim'
     *          })
     *      }
     * }
     * ```
     * 
     * The return is an animation containing two methods:
     * * `play()`: Play the animation (Already the case when calling the method)
     * * `stop()`: Stop the animation
     * 
     * They have a hook:
     * 
     * `onFinish`: Triggered when the animation is finished 
     * 
     * ```ts
     * animation.onFinish = () => {
     *      console.log('finish !')
     * }
     * ```
     * 
     * @title Show Animation
     * @method scene.showAnimation(object)
     * @param {object} object
     * @returns {Animation}
     * @memberof RpgScene
     */
    showAnimation({ 
        graphic,
        animationName,
        attachTo,
        x = 0,
        y = 0,
        loop = false
    }: { 
        graphic: string, 
        animationName: string, 
        attachTo: PIXI.Sprite, 
        x?: number, 
        y?: number,
        loop?: boolean
    }): Animation {
        const animation = new Animation(graphic)
        attachTo.addChild(animation)
        if (!loop) {
            animation.onFinish = () => {
                animation.stop()
            }
        }
        animation.x = x
        animation.y = y
        animation.play(animationName)
        this.animations.push(animation)
        return animation
    }

    getPlayer(id) {
        return this.objects.get(id)
    }

    // Hooks
    onInit() {}
    onLoad() {}
    onDraw(t: number, dt: number) {}
    onAddSprite(sprite: Character) {}
    onRemoveSprite(sprite: Character) {}
}