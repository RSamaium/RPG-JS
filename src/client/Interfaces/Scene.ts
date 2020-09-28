import * as PIXI from 'pixi.js'

export interface IScene {
    load(obj: object): PIXI.Container
    draw(t: number, dt: number)
    removeObject?(obj: object)
}