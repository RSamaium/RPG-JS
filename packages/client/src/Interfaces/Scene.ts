import * as PIXI from 'pixi.js'

export interface IScene {
    load(obj: object): any
    draw(t: number)
    removeObject(id: string)
    addObject(obj: object, id: string)
    updateScene(obj: { data: object, partial: object })
}