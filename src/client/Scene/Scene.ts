export class Scene {
   
    protected objects: Map<string, any> = new Map()

    constructor(protected game: any) {}

    draw(t, dt) {
        const logicObjects = this.game.world
        const renderObjects = this.objects
        logicObjects.forEach((val, key) => {
            if (!renderObjects.has(key)) {
                this.addObject(val, key)
            }
            else {
                renderObjects.get(key).update(val, t, dt)
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

    addObject(obj, id) {}

    removeObject(id) {}
}