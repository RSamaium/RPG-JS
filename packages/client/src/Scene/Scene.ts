import { Utils } from '@rpgjs/common'
import * as PIXI from 'pixi.js'
import { KeyboardControls, GameEngine } from 'lance-gg'
import RpgSprite from '../Sprite/Character'
import { Animation } from '../Effects/Animation'

const { isArray } = Utils

interface ControlOptions {
    repeat?: boolean
    bind: string | string[]
    method?: Function
}

interface Controls {
    [controlName: string]: ControlOptions
}

export class Scene {
   
    protected objects: Map<string, any> = new Map()
    protected loader = PIXI.Loader.shared
    protected animationLayer: PIXI.Container = new PIXI.Container()

    private controls: KeyboardControls
    private animations: Animation[] = []
    private _controlsOptions: Controls = {}

    constructor(protected game: GameEngine<any>) {
        this.controls = this.game.clientEngine.controls
        this.setInputs(this.inputs)
    }

    /**
     * Assign custom inputs to the scene
     * 
     * The object is the following:
     * 
     * * the key of the object is the name of the control. Either it is existing controls (Up, Dow, Left, Right, Action, Back) or customized controls
     * * The value is an object representing control information:
     *      * repeat {boolean} The key can be held down to repeat the action. (false by default)
     *      * bind {string | string[]} To which key is linked the control
     *      * method {Function} Function to be triggered. If you do not set this property, the name of the control is sent directly to the server.
     * 
     * ```ts 
     * import { RpgSceneMap, Control, Input } from '@rpgjs/client'
     * 
     * export class SceneMap extends RpgSceneMap {
     *      onInit() {
     *          this.setInputs({
                    [Control.Up]: {
                        repeat: true,
                        bind: Input.Up
                    },
                    [Control.Down]: {
                        repeat: true,
                        bind: Input.Down
                    },
                    [Control.Right]: {
                        repeat: true,
                        bind: Input.Right
                    },
                    [Control.Left]: {
                        repeat: true,
                        bind: Input.Left
                    },
                    [Control.Action]: {
                        bind: [Input.Space, Input.Enter]
                    },
                    [Control.Back]: {
                        bind: Input.Escape
                    },

                    // The myscustom1 control is sent to the server when the A key is pressed.
                    mycustom1: {
                        bind: Input.A
                    },

                    // the myAction method is executed when the B key is pressed
                    mycustom2: {
                        bind: Input.B,
                        method: this.myAction
                    }
                })
     *      }
            myAction() {

            }
     * }
     * ```
     * @enum {string} Control 
     * 
     * Control.Up | up
     * Control.Down | down
     * Control.Left | left
     * Control.Right | right
     * Control.Action | action
     * Control.Back | back
     * @title Set Inputs
     * @method scene.setInputs(inputs)
     * @param {object} inputs
     * @memberof RpgScene
     */
    setInputs(inputs: Controls) {
        if (!inputs) return
        this.controls['boundKeys'] = {}
        for (let control in inputs) {
            const option = inputs[control]
            const { method, bind } = option
            if (method) {
                option.method = method.bind(this)
            }
            let inputsKey: any = bind
            if (!isArray(inputsKey)) {
                inputsKey = [bind]
            }
            for (let input of inputsKey) {
                this.controls.bindKey(input, control, option)
            }
        }
        this._controlsOptions = inputs
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

    /**
     * From the name of the entry, we retrieve the control information
     * 
     * ```ts 
     * import { RpgSceneMap, Input } from '@rpgjs/client'
     * 
     * export class SceneMap extends RpgSceneMap {
     *      onLoad() {
     *          const control = this.getControl(Input.Enter)
     *          if (control) {
     *              console.log(control.actionName) // action
     *          }
     *      }
     * }
     * ```
     * @title Get Control
     * @method scene.getControl(inputName)
     * @param {string} inputName
     * @returns { { actionName: string, options: any } | undefined }
     * @memberof RpgScene
     */
    getControl(inputName: string): { actionName: string, options: any } | undefined {
        const { boundKeys  } = this.controls as any
        return boundKeys[inputName]
    }

    /**
     * Triggers an input according to the name of the control
     * 
     * ```ts 
     * import { RpgSceneMap, Control } from '@rpgjs/client'
     * 
     * export class SceneMap extends RpgSceneMap {
     *      onLoad() {
     *          this.applyControl(Control.Action)
     *      }
     * }
     * ```
     * 
     * You can put a second parameter or indicate on whether the key is pressed or released
     * 
     * ```ts 
     * import { RpgSceneMap, Control } from '@rpgjs/client'
     * 
     * export class SceneMap extends RpgSceneMap {
     *      onLoad() {
     *          this.applyControl(Control.Up, true) // keydown
     *          this.applyControl(Control.Up, false) // keyup
     *      }
     * }
     * ```
     * @title Apply Control
     * @method scene.applyControl(controlName,isDown)
     * @param {string} controlName
     * @param {boolean} [isDown]
     * @memberof RpgScene
     */
    applyControl(controlName: string, isDown?: boolean | undefined) {
        const control = this._controlsOptions[controlName]
        if (control) {
            const input = isArray(control.bind) ? control.bind[0] : control.bind
            if (isDown === undefined) {
                this.controls.applyKeyPress(input as string)
            }
            else if (isDown) {
                this.controls.applyKeyDown(input as string)
            }
            else {
                this.controls.applyKeyUp(input as string)
            }
        }
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

    onUpdateObject(logic, sprite: RpgSprite, moving: boolean): any {}

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
        loop = false,
        replaceGraphic = false
    }: { 
        graphic: string, 
        animationName: string, 
        attachTo?: RpgSprite, 
        x?: number, 
        y?: number,
        loop?: boolean,
        replaceGraphic?: boolean
    }): Animation {
        if (replaceGraphic && attachTo) {
            return attachTo.showAnimation(graphic, animationName)
        }
        const animation = new Animation(graphic)
        this.animationLayer.addChild(animation)
        if (!loop) {
            animation.onFinish = () => {
                animation.stop()
            }
        }
        if (attachTo) {
            animation.attachTo = attachTo
        }
        else {
            animation.x = x
            animation.y = y
        }
        animation.play(animationName)
        this.animations.push(animation)
        return animation
    }

     /**
     * Retrieve a sprite according to its identifier
     * 
     * @title Get Sprite
     * @method scene.getSprite(id)
     * @param {string} id
     * @returns {RpgSprite}
     * @memberof RpgScene
     */
    getSprite(id: string) { return this.getPlayer(id) }
    getPlayer(id: string): RpgSprite {
        return this.objects.get(id)
    }

     /**
     * Retrieve a sprite that the player controls
     * 
     * @title Get Current Player
     * @method scene.getCurrentPlayer()
     * @returns {RpgSprite}
     * @memberof RpgScene
     */
    getCurrentPlayer(): RpgSprite {
        return this.objects.get(this.game.playerId)
    }

    // Hooks
    onInit() {}
    onLoad() {}
    onDraw(t: number, dt: number) {}
    onAddSprite(sprite: RpgSprite) {}
    onRemoveSprite(sprite: RpgSprite) {}
}

export interface Scene {
    inputs: Controls
}