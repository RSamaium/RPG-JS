import { RpgCommonEvent } from '@rpgjs/common'
import { IScene } from '../Interfaces/Scene'
import { Scene } from './Scene'
import { SceneData } from './SceneData'
import Character from '../Sprite/Character'
import { spritesheets } from '../Sprite/Spritesheets'
import TWEEN from '@tweenjs/tween.js'

const POINTER_SIZE = { w: 80, h: 40 }

@SceneData({
    inputs: {
        'left': {
            method: 'selectLeft'
        },
        'right': {
            method: 'selectRight'
        },
        'space': {
            method: '_selectEnemy'
        },
        'escape': {
            method: 'back'
        }
    } 
})
export class SceneBattle extends Scene implements IScene {

    private background
    private viewport: PIXI.Container = new PIXI.Container()
    private enemiesContainer: PIXI.Container = new PIXI.Container()
    private pointer: PIXI.Graphics = new PIXI.Graphics()
    private pointerIndex: number = 0
    private pointerActive: boolean = false

    constructor(
            protected game: any, 
            private options: { screenWidth?: number, screenHeight?: number } = {}) {
        super(game)
    }

    get enemiesLength() {
        return this.enemiesContainer.children.length
    }

    load(obj): PIXI.Container {
        const spritesheet = spritesheets.get('forest')
        this.viewport.addChild(PIXI.Sprite.from(spritesheet.image))
        this.viewport.addChild(this.enemiesContainer)
        this.viewport.addChild(this.createPointer())
        return this.viewport
    }

    private createPointer() {
        const w = POINTER_SIZE.w
        const h = POINTER_SIZE.h
        this.pointer.beginFill(0x4e5188)
        this.pointer.lineStyle(2, 0xffffff, 1)
        this.pointer.lineTo(0, 0)
        this.pointer.lineTo(w / 2, h)
        this.pointer.lineTo(w, 0)
        this.pointer.closePath()
        this.pointer.endFill()
        return this.pointer
    }

    selectLeft() {
        if (!this.pointerActive) return
        if (this.pointerIndex - 1 < 0) {
            this.pointerIndex = this.enemiesLength - 1
        }
        else {
            this.pointerIndex--
        }
        this.refreshPointer()
    }

    selectRight() {
        if (!this.pointerActive) return
        if (this.pointerIndex + 1 == this.enemiesLength) {
            this.pointerIndex = 0
        }
        else {
            this.pointerIndex++
        }
        this.refreshPointer()
    }

    _selectEnemy() {
        this['selectEnemy'](this.getObjectId(this.pointerIndex))
    }

    back() {
        this.active = false
    }

    set active(val) {
        this.pointerActive = val
        //val ? this.listenInputs() : this.stopInputs()
    }

    get active() {
        return this.pointerActive
    }

    draw(t, dt, frame) {
        super.draw(t, dt, frame)
        TWEEN.update(TWEEN.now())
        this.pointer.visible = this.pointerActive
    }

    getObjectId(index: number) {
        const sprite = this.enemiesContainer.children[index]
        return sprite['id']
    }

    addObject(obj, id) {
        let sprite
        if (obj instanceof RpgCommonEvent) {
            sprite = new Character({
                ...obj,
                fixed: true
            }, this)
            sprite.id = id
            sprite.onSetGraphic = (spritesheet) => { 
                sprite.y = 30   
                sprite.anchor.set(0.5, 0)
                this.refreshPositions()
                new TWEEN.Tween({
                    alpha: 0
                }).to({ alpha: 1}, 500)
                    .onUpdate((object) => {
                        sprite.alpha = object.alpha
                    })
                    .start(TWEEN.now())
            }
            this.enemiesContainer.addChild(sprite)
        }
        else {
            sprite = new PIXI.Container()
        }
        this.objects.set(id, sprite)
    }

    removeObject(id) {
        super.removeObject(id)
        this.refreshPositions()
    }

    addEffect(data) {
        for (let enemy of data) {
            const { damage } = enemy.damage
            this.objects.get(enemy.enemy).addEffect(damage)
        }
    }

    private refreshPointer() {
        const sprite = this.enemiesContainer.children[this.pointerIndex]
        if (!sprite) {
            return
        }
        this.pointer.x = sprite.x - POINTER_SIZE.w / 2
        this.pointer.y = 30
    }

    private refreshPositions() {
        const canvasWidth = this.game.renderer.width
        const array = this.enemiesContainer.children
        const nb = this.enemiesLength
        const columnSize = canvasWidth / nb
        for (let i=0 ; i < nb ; i++) {
            let enemy = array[i]
            enemy.x = (i * columnSize) + columnSize / 2
        }
        this.refreshPointer()
    }
}