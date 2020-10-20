import { RpgCommonEvent } from '@rpgjs/common'
import { IScene } from '../Interfaces/Scene'
import { Scene } from './Scene'
import Character from '../Sprite/Character'
import { spritesheets } from '../Sprite/Spritesheets'
import * as PIXI from 'pixi.js'

export class SceneBattle extends Scene implements IScene {

    private background
    private viewport: PIXI.Container = new PIXI.Container()
    private enemiesContainer: PIXI.Container = new PIXI.Container()

    constructor(
            protected game: any, 
            private options: { screenWidth?: number, screenHeight?: number } = {}) {
        super(game)
    }

    load(obj): PIXI.Container {
        const spritesheet = spritesheets.get('forest')
        this.viewport.addChild(PIXI.Sprite.from(spritesheet.image))
        this.viewport.addChild(this.enemiesContainer)
        return this.viewport
    }

    draw(t, dt) {
        super.draw(t, dt)
    }

    addObject(obj, id) {
        let sprite
        if (obj instanceof RpgCommonEvent) {
            sprite = new Character(obj, this)
            console.log(sprite)
        }
        else {
            sprite = new PIXI.Container()
        }
        this.enemiesContainer.addChild(sprite)
        this.objects.set(id, sprite)
    }

    removeObject(id) {
        this.objects.delete(id)
    }
}