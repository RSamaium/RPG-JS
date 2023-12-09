import { RpgPlugin, HookClient, DefaultInput, InjectContext } from '@rpgjs/common'
import { KeyboardControls } from '../KeyboardControls'
import RpgSprite from '../Sprite/Character'
import { Animation } from '../Effects/Animation'
import { BehaviorSubject, Observable, Subject } from 'rxjs'
import { GameEngineClient } from '../GameEngine'
import { RpgComponent } from '../Components/Component'
import { Controls } from '@rpgjs/types'
import { Container } from 'pixi.js'
import { RpgGui } from '../Gui/Gui'

export type SceneObservableData = { 
    data: {
        [key: string]: any
    }, 
    partial: {
        [key: string]: any
    } 
}

export interface SceneSpriteLogic {
    paramsChanged: {
        [key: string]: any
    } | null,
    prevParamsChanged: object
}

export abstract class Scene {
    protected objects: Map<string, RpgComponent> = new Map()
    protected animationLayer: Container = new Container()

    private controls: KeyboardControls = this.context.inject(KeyboardControls)
    private animations: Animation[] = []

    private _data: BehaviorSubject<SceneObservableData> = new BehaviorSubject({
        data: {},
        partial: {}
    })

    /**
     *  @deprecated Use `inject(GameEngineClient)` instead. Will be removed in v5
     */
    public game: GameEngineClient = this.context.inject(GameEngineClient)

    /**
     * Listen to the movement of objects on stage
     * 
     * @prop {Observable<{ [key: string]: object }>} [objectsMoving]
     * @readonly
     * @memberof RpgScene
     * @since v4.1.0
     * 
     * In <module>/scene-map.ts
     * 
     * ```ts
     * import { RpgSceneMap } from '@rpgjs/client'
     * 
     * export default {
     *      onAfterLoading(scene: RpgSceneMap) {
     *         scene.objectsMoving.subscribe((objects) => {
     *             console.log(objects)
     *          })
     *      }
     * }
     * ```
     */
    public readonly objectsMoving: Subject<{
        [key: string]: any
    }> = new Subject()

    constructor(protected context: InjectContext) {
        const { globalConfig } = this.game.clientEngine
        const mergeInputs = {
            ...DefaultInput,
            ...(globalConfig.inputs || {})
        }
        this.controls.setInputs(this.inputs || mergeInputs)
        RpgGui._setSceneReady(this)
    }

    /**
     * Listen to all the synchronized values of the scene with the server
     * 
     * ```ts 
     * import { RpgClient, RpgModule, RpgSceneMap } from '@rpgjs/client'
     * 
     *  @RpgModule<RpgClient>({ 
            scenes: {
                map: {
                    onAfterLoading(scene: RpgSceneMap) {
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

    private triggerSpriteChanges(logic: SceneSpriteLogic, sprite: RpgComponent, moving: boolean) {
        if (this.onUpdateObject) this.onUpdateObject(logic, sprite, moving)
        RpgPlugin.emit(HookClient.UpdateSprite, [sprite, logic], true)
    }

     /** @internal */
    update(obj?: SceneObservableData) {
        if (!obj) {
            this.updateScene(this._data.value)
            return
        }
        this.updateScene(obj)
        RpgPlugin.emit(HookClient.SceneOnChanges, [this, obj], true)
        this._data.next(obj)
    }

     /** @internal */
    draw(time: number, deltaTime: number, deltaRatio: number, frame: number) {
        const logicObjects = { 
            ...this.game.world.getObjects(), 
            ...this.game.events,
            ...this.game.getShapes()
        }
        const renderObjects = this.objects
        const sizeLogic = Object.values(logicObjects).length
        const objectMoving = {}
        for (let key in logicObjects) {
            const val: any = logicObjects[key].object
            const valueChanged = logicObjects[key].paramsChanged
            if (!renderObjects.has(key)) {
                const sprite = this.addObject(val, key)
                this.triggerSpriteChanges(val, sprite, true)
            }
            else {
                const object = renderObjects.get(key)
                if (!object?.update) return
                const ret = object.update(val, valueChanged, time, deltaRatio)
                this.triggerSpriteChanges(val, object, ret.moving)
                if (ret.moving) objectMoving[val.id] = val
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
            animation.update(deltaRatio)
        }
        this.onDraw(time)
        if (Object.values(objectMoving).length) {
            this.objectsMoving.next(objectMoving)
        }
        RpgPlugin.emit(HookClient.SceneDraw, this)
    }

    abstract onUpdateObject(logic: SceneSpriteLogic, sprite: RpgComponent, moving: boolean): void
    abstract addObject(obj, id: string): RpgComponent
    abstract removeObject(id: string)

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
     * import { RpgClient, RpgModule, RpgSceneMap } from '@rpgjs/client'
     * 

     * @RpgModule<RpgClient>({ 
            scenes: {
                map: {
                    onAfterLoading(scene: RpgSceneMap) {
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
        attachTo?: RpgComponent, 
        x?: number, 
        y?: number,
        loop?: boolean,
        replaceGraphic?: boolean
    }): Animation | undefined {
        if (replaceGraphic && attachTo) {
            attachTo.showAnimation(graphic, animationName)
            return
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
     * @returns {RpgSprite | undefined}
     * @memberof RpgScene
     */
    getSprite(id: string) { return this.getPlayer(id) }
    getPlayer(id: string): RpgComponent | undefined {
        return this.objects.get(id)
    }

     /**
     * Retrieve a sprite that the player controls
     * 
     * @title Get Current Player
     * @method scene.getCurrentPlayer()
     * @returns {RpgSprite | undefined}
     * @memberof RpgScene
     */
    getCurrentPlayer(): RpgSprite | RpgComponent | undefined {
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