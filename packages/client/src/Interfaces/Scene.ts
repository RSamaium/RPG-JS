import * as PIXI from 'pixi.js'

export interface IScene {
    load(obj: object): any
    draw(t: number, dt: number)
    removeObject(id: string)
    addObject(obj: object, id: string)
}