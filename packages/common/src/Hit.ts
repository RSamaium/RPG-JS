import { TiledObjectClass } from '@rpgjs/tiled'
import SAT from 'sat'
import { isInstanceOf } from './Utils'

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

export enum HitType {
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
        if (type == HitType.Box) {
            if (hit1.pos.x <= hit2.pos.x + hit2.w &&
                hit1.pos.x + hit1.w >= hit2.pos.x &&
                hit1.pos.y <= hit2.pos.y + hit2.h &&
                hit1.h + hit1.pos.y >= hit2.pos.y) {
                return true
             }
            return false
        }
        if (isInstanceOf(hit1, SAT.Box)) hit1 = hit1.toPolygon()
        if (isInstanceOf(hit2, SAT.Box)) hit2 = hit2.toPolygon()
        switch (type) {
            case HitType.Circle:
                collided = SAT.testPolygonCircle(hit1, hit2)
            break
            case HitType.Polygon:
                collided = SAT.testPolygonPolygon(hit1, hit2)
            break
        }
        return collided
    }
}

export const Hit = new HitClass()