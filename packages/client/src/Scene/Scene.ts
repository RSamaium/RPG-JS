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
        this.setInput()
    }

    private setInput() {
        const clientEngine = this.game.clientEngine
        this.controls = new KeyboardControls(clientEngine, clientEngine.eventEmitter)
        if (!this.inputs) return
        for (let input in this.inputs) {
            const option = this.inputs[input]
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

    stopInputs() {
        this.controls.stop = true
    }

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
    }) {
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