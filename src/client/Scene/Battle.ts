import { IScene } from '../Interfaces/Scene'
import { spritesheets } from '../Sprite/Spritesheets'
import * as PIXI from 'pixi.js'

export class SceneBattle implements IScene {

    private background
    private viewport: PIXI.Container = new PIXI.Container()

    constructor(
            private game: any, 
            private options: { screenWidth?: number, screenHeight?: number } = {}) {
    }

    load(obj): PIXI.Container {
        const container = new PIXI.Container()
        const spritesheet = spritesheets.get('forest')
        this.viewport.addChild(PIXI.Sprite.from(spritesheet.image))
        return this.viewport
    }

    draw() {
        this.game.world.forEachObject((id, obj) => {
            //console.log(obj)
        })
    }
}