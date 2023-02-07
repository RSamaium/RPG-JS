import { HitEllipse, HitObject, HitType } from '@rpgjs/types'
import  SAT from 'sat'
import { isInstanceOf } from './Utils'
export { HitType, HitObject } from '@rpgjs/types'

class HitClass {

    createObjectHitbox(x: number, y: number, z: number, w: number, h: number): SAT.Box {
        return new SAT.Box(new SAT.Vector(x, y - z), w, h)
    }
    
    getHitbox(obj: HitObject, offset?: { x: number, y: number }): {
        hitbox: SAT,
        type?: string,
        name?: string
    } {
        let hitbox: SAT, type: string | undefined
        if (!offset) offset = { x: 0, y: 0 }
        const x = obj.x + offset.x
        const y = obj.y + offset.y
        if ('ellipse' in obj || obj.type == HitType.Circle) {
            type = HitType.Circle
            const radius = (<HitEllipse>obj).width / 2
            hitbox = new SAT.Circle(new SAT.Vector(x + radius, y + radius), radius)
        }
        else if ('polygon' in obj) {
            type = HitType.Polygon
            hitbox = new SAT.Polygon(new SAT.Vector(x, y), obj.polygon.map(pos => new SAT.Vector(+pos.x, +pos.y)))
        }
        else if (!('polygon' in obj) && ('width' in obj) && ('height' in obj)) {
            type = HitType.Box
            hitbox = new SAT.Box(new SAT.Vector(x, y), obj.width, obj.height)
        }
        else {
            hitbox = new SAT.Vector(x, y)
            type = obj.type
        }
        return { 
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