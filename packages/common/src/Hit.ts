import SAT from 'sat'

export interface HitObject {
    ellipse: boolean
    gid: number | null
    height: number
    polygon: any[] | null
    polyline: any[] | null
    properties: object
    rotation: number
    visible: boolean
    width: number
    x: number
    y: number
    type?: string
    name?: string
}

class HitClass {
    
    getHitbox(obj: HitObject, offset?: { x: number, y: number }) {
        let hitbox, type
        if (!offset) offset = { x: 0, y: 0 }
        const x = obj.x + offset.x
        const y = obj.y + offset.y
        if (obj.ellipse) {
            type = 'circle'
            hitbox = new SAT.Circle(new SAT.Vector(x, y), obj.width)
        }
        else if (obj.polygon) {
            type = 'polygon'
            hitbox = new SAT.Polygon(new SAT.Vector(x, y), obj.polygon.map(pos => new SAT.Vector(pos.x, pos.y)))
        }
        else if (!obj.polygon && obj.width > 0 && obj.height > 0) {
            type = 'box'
            hitbox = new SAT.Box(new SAT.Vector(x, y), obj.width, obj.height)
        }
        else {
            hitbox = new SAT.Vector(x, y)
            type = obj.type
        }
        return { 
            properties: obj.properties,
            hitbox,
            type,
            name: obj.name
        }
    }

    testPolyCollision(type, hit1, hit2): boolean {
        let collided = false
        switch (type) {
            case 'box':
                collided = SAT.testPolygonPolygon(hit1.toPolygon(), hit2.toPolygon())
            break
            case 'circle':
                collided = SAT.testPolygonCircle(hit1.toPolygon(), hit2.hitbox)
            break
            case 'polygon':
                collided = SAT.testPolygonPolygon(hit1.toPolygon(), hit2.hitbox)
            break
        }
        return collided
    }
}


export const Hit = new HitClass()
