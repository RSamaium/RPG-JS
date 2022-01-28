import { RpgPlugin, HookClient } from '@rpgjs/common'
import { KeyboardControls, Controls } from '../KeyboardControls'
import RpgSprite from '../Sprite/Character'
import { Animation } from '../Effects/Animation'
import { BehaviorSubject, Observable } from 'rxjs'

type SceneObservableData = { data: object, partial: object }

export class Scene {
   
    protected objects: Map<string, any> = new Map()
    protected loader = PIXI.Loader.shared
    protected animationLayer: PIXI.Container = new PIXI.Container()

    private controls: KeyboardControls
    private animations: Animation[] = []

    private _data: BehaviorSubject<SceneObservableData> = new BehaviorSubject({
        data: {},
        partial: {}
    })

    constructor(protected game: any) {
        const { globalConfig } = this.game.clientEngine
        this.controls = this.game.clientEngine.controls
        this.controls.setInputs(this.inputs || globalConfig.inputs)
    }

    /**
     * Listen to all the synchronized values of the scene with the server
     * 
     * ```ts 
     * import { RpgClient, RpgModule, RpgSceneMap, RpgSprite } from '@rpgjs/client'
     * 
     *  @RpgModule<RpgClient>({ 
            scenes: {
                map: {
                    onAfterLoading(scene: RpgSceneMap, sprite: RpgSprite) {
                      scene.valuesChange.subscribe((obj) => {
                         console.log(obj.data, obj.partial)
                      })
                    }
                }
            }
        })
        export default class RpgClientModuleEngine {}
     * ```
     * 
     * - `data` represents all the current data of the scene (`users`, `events` and others)
     * - `partial` represents only the data that has changed on the scene
     * 
     * > In the class, you can also use the onChanges hook
     * 
     * 
     * @prop {Observable<{ data: object, partial: object }>} [valuesChange]
     * @readonly
     * @memberof RpgScene
     */
    get valuesChange(): Observable<SceneObservableData> {
        return this._data.asObservable() 
    }

    

    private triggerSpriteChanges(logic, sprite: RpgSprite, moving: boolean) {
        if (this.onUpdateObject) this.onUpdateObject(logic, sprite, moving)
        RpgPlugin.emit(HookClient.UpdateSprite, [sprite, logic], true)
        if (logic.paramsChanged) {
            sprite.onChanges(logic.paramsChanged, logic.prevParamsChanged)
            RpgPlugin.emit(HookClient.ChangesSprite, [sprite, logic.paramsChanged, logic.prevParamsChanged], true)
            logic.paramsChanged = null
        }
    }

    update(obj: SceneObservableData) {
        this.updateScene(obj)
        RpgPlugin.emit(HookClient.SceneOnChanges, [this, obj], true)
        this._data.next(obj)
    }

    draw(t: number, dt: number, frame: number) {
        const logicObjects = { ...this.game.world.getObjects(), ...this.game.events }
        const renderObjects = this.objects
        const sizeLogic = Object.values(logicObjects).length
        for (let key in logicObjects) {
            const val = logicObjects[key].object
            if (!renderObjects.has(key)) {
                const sprite: any = this.addObject(val, key)
                this.triggerSpriteChanges(val, sprite, true)
            }
            else {
                const object = renderObjects.get(key)
                if (!object.update) return
                const ret = object.update(val, t)
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
        this.onDraw(t)
        RpgPlugin.emit(HookClient.SceneDraw, this)
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
     * import { RpgClient, RpgModule, RpgSceneMap, RpgSprite } from '@rpgjs/client'
     * 

     * @RpgModule<RpgClient>({ 
            scenes: {
                map: {
                    onAfterLoading(scene: RpgSceneMap, sprite: RpgSprite) {
                      const animation = scene.showAnimation({
                         graphic: 'my-spritesheet',
                          animationName: 'my-anim'
                      })
                    }
                }
            }
        })
        export default class RpgClientModuleEngine {}
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
    onChanges(obj) {}
    onDraw(t: number) {}
    onAddSprite(sprite: RpgSprite) {}
    onRemoveSprite(sprite: RpgSprite) {}
}

export interface Scene {
    inputs: Controls,
    updateScene(obj: SceneObservableData)
}