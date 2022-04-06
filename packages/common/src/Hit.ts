import SAT from 'sat'

export interface HitObject {
    ellipse?: boolean
    gid?: number
    height: number
    polygon?: { x: number, y: number }[]
    polyline?: any[]
    properties?: {
        [key: string]: any
    }
    rotation?: number
    visible?: boolean
    width: number
    x: number
    y: number
    type?: string
    name?: string
}

enum HitType {
    Box = 'box',
    Circle = 'circle',
    Polygon = 'polygon'
}

class HitClass {

    createObjectHitbox(x: number, y: number, z: number, w: number, h: number): SAT.Box {
        return new SAT.Box(new SAT.Vector(x, y - z), w, h)
    }
    
    getHitbox(obj: HitObject, offset?: { x: number, y: number }): {
        properties: {
            [key: string]: any
        } | undefined,
        hitbox: SAT,
        type: string,
        name: string | undefined
    } {
        let hitbox, type
        if (!offset) offset = { x: 0, y: 0 }
        const x = obj.x + offset.x
        const y = obj.y + offset.y
        if (obj.ellipse) {
            type = HitType.Circle
            const radius = obj.width / 2
            hitbox = new SAT.Circle(new SAT.Vector(x + radius, y + radius), radius)
        }
        else if (obj.polygon) {
            type = HitType.Polygon
            hitbox = new SAT.Polygon(new SAT.Vector(x, y), obj.polygon.map(pos => new SAT.Vector(+pos.x, +pos.y)))
        }
        else if (!obj.polygon && obj.width > 0 && obj.height > 0) {
            type = HitType.Box
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

    testPolyCollision(type: string, hit1: SAT, hit2: SAT): boolean {
        let collided = false
        switch (type) {
            case HitType.Box:
                collided = SAT.testPolygonPolygon(hit1.toPolygon(), hit2.toPolygon())
            break
            case HitType.Circle:
                collided = SAT.testPolygonCircle(hit1.toPolygon(), hit2)
            break
            case HitType.Polygon:
                collided = SAT.testPolygonPolygon(hit1, hit2.toPolygon())
            break
        }
        return collided
    }
}


export const Hit = new HitClass()
