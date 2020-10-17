import * as PIXI from 'pixi.js'

export class Scene {
   
    protected objects: Map<string, any> = new Map()
    protected loader = PIXI.Loader.shared

    constructor(protected game: any) {}

    draw(t, dt) {
        const logicObjects = this.game.world
        const renderObjects = this.objects
        logicObjects.forEach((val, key) => {
            if (!renderObjects.has(key)) {
                this.addObject(val, key)
            }
            else {
                const ret = renderObjects.get(key).update(val, t, dt)
                if (this.onUpdateObject) this.onUpdateObject(ret)
            }
        })
        if (logicObjects.size < renderObjects.size) {
            renderObjects.forEach((val, key) => {
                if (!logicObjects.has(key)) {
                    this.removeObject(key)
                }
            })
        }
    }

    onUpdateObject(ret) {}

    addObject(obj, id) {}

    removeObject(id) {}

    getPlayer(id) {
        return this.objects.get(id)
    }
}