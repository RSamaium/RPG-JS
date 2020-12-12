import { DynamicObject, BaseTypes, ThreeVector } from 'lance-gg'
import { intersection } from './Utils'
import SAT from 'sat'
import { Hit } from './Hit'
import Map from './Map'

const ACTIONS = { IDLE: 0, RUN: 1, ACTION: 2 }

enum Direction { 
    Up = 'up',
    Down = 'down',
    Left = 'left',
    Right = 'right'
}

export default class Player extends DynamicObject<any, any> {

    map: string = ''
    graphic: string = ''
    speed: number = 3
    height: number = 0
    width: number = 0
    canMove: number = 1
    events: any[] = []
    direction: number
    collisionWith: any[] = []
    data: any = {}
    hitbox: any
    player: any
    server: any
    position: any

    detectChanges: boolean = true 

    private _hitboxPos: any

    static get netScheme() {
        const obj =  Object.assign({
            direction: { type: BaseTypes.TYPES.INT8 }
        }, super.netScheme) 
        return obj
    }

    static get ACTIONS() {
        return ACTIONS
    }

    constructor(gameEngine, options, props: any = {}) {
        super(gameEngine, options, props)
        this.direction = props.direction || 0
        this.position = new ThreeVector(0, 0, 0)
        this.position.x = props.x || 0
        this.position.y = props.y || 0
        this._hitboxPos = new SAT.Vector(this.position.x, this.position.y)
        this.setHitbox(this.width, this.height)
    }

    set posX(val) {
        this.position.x = val
        this._hitboxPos.x = val
        this._syncPlayer()
    }

    set posY(val) {
        this.position.y = val
        this._hitboxPos.y = val
        this._syncPlayer()
    }

    set posZ(val) {
        this.position.z = val
    }

    get mapInstance() {
        return Map.buffer.get(this.map)
    }

    setSizes(obj: any) {
        this.width = obj.width 
        this.height = obj.height
        if (obj.hitbox) {
            this.setHitbox(obj.hitbox.width, obj.hitbox.height)
        }
    }

    setHitbox(width, height) {
        this.hitbox = new SAT.Box(this._hitboxPos, width, height)
    }

    set wHitbox(val) {
        this.hitbox.w = val
    }

    set hHitbox(val) {
        this.hitbox.h = val
    }

    get wHitbox() {
        return this.hitbox.w
    }

    get hHitbox() {
        return this.hitbox.h
    }
    
    defineNextPosition(direction) {
        switch (direction) {
            case 'left':
                return {
                    x: this.position.x - this.speed,
                    y: this.position.y,
                    z: this.position.z
                }
            case 'right':
                return {
                    x: this.position.x + this.speed,
                    y: this.position.y,
                    z: this.position.z
                }
            case 'up':
                return {
                    x: this.position.x,
                    y: this.position.y - this.speed,
                    z: this.position.z
                }
            case 'down':
                return {
                    x: this.position.x,
                    y: this.position.y + this.speed,
                    z: this.position.z
                }
        }
        return this.position
    }

    setPosition({ x, y, tileX, tileY }, move = true) {
        const { tileWidth, tileHeight } = this.mapInstance
        if (x !== undefined) this.posX = x 
        if (y !== undefined) this.posY = y 
        if (tileX !== undefined) this.posX = tileX * tileWidth
        if (tileY !== undefined) this.posY = tileY * tileHeight
    }

    triggerCollisionWith(type?: number) {
        for (let collisionWith of this.collisionWith) {
            const { properties } = collisionWith
            if (type == Player.ACTIONS.ACTION) {
                if (collisionWith.onAction) collisionWith.execMethod('onAction', [this])
            }
            else if (collisionWith.onPlayerTouch) collisionWith.execMethod('onPlayerTouch', [this])
            else if (properties) {
                if (properties['go-map'] && this['changeMap']) this['changeMap'](properties['go-map'])
            }
        }
    }

    zCollision(other): boolean {
        const z = this.position.z
        const otherZ = other.position.z
        return intersection([z, z + this.height], [otherZ, otherZ + other.height])
    }

    move(direction: Direction) {
        this.collisionWith = []

        const nextPosition = this.defineNextPosition(direction)
        const map = this.mapInstance

        if (!map) {
            return false
        }
        if (nextPosition.x < 0) {
            this.posX = 0 
            return false
        }
        if (nextPosition.y < 0) {
            this.posY = 0 
            return false
        }
        if (nextPosition.x > map.widthPx - this.width) {
            this.posX = map.widthPx - this.width
            return false
        }
        if (nextPosition.y > map.heightPx - this.height) {
            this.posY = map.heightPx - this.height
            return false
        }

        const hitbox = Hit.createObjectHitbox(nextPosition.x, nextPosition.y, 0, this.hitbox.w, this.hitbox.h)
        let isClimbable = false

        const tileCollision = (x, y): boolean => {
            const tile = map.getTileByPosition(x, y, [nextPosition.z, this.height])
            if (tile.hasCollision) {
                return true
            }
            else if (tile.objectGroups) {
                const tilePos = map.getTileOriginPosition(x, y) 
                for (let object of tile.objectGroups) {
                    const hit = Hit.getHitbox(object, {
                        x: tilePos.x,
                        y: tilePos.y
                    })
                    const collided = Hit.testPolyCollision(hit.type, hit.hitbox, hitbox)
                    if (collided) {
                        return true
                    }
                }
            }
            if (!isClimbable && tile.isClimbable) {
                isClimbable = true
            }
            return false
        }

        if (
            tileCollision(nextPosition.x, nextPosition.y) || 
            tileCollision(nextPosition.x + this.hitbox.w, nextPosition.y) || 
            tileCollision(nextPosition.x, nextPosition.y + this.hitbox.h) || 
            tileCollision(nextPosition.x + this.hitbox.w, nextPosition.y + this.hitbox.h)
        ) {
            return false
        }

        let eventsCollection
        
        if (this.gameEngine.world.groups.has(this.map)) {
            eventsCollection = this.gameEngine.world.getObjectsOfGroup(this.map)
        }
        else {
            eventsCollection = Object.values(this.gameEngine.world.objects)
        }

        const events = [...eventsCollection, ...this.events, ...Object.values(this.gameEngine.events)]

        for (let event of events) {
            if (event.id == this.id) continue
            if (!this.zCollision(event)) continue
            const collided = Hit.testPolyCollision('box', hitbox, event.hitbox)
            if (collided) {
                this.collisionWith.push(event)
                this.triggerCollisionWith()
                return false
            }
        }

        for (let shape of map.shapes) {
            const { collision, z } = shape.properties
            if (z !== undefined && !this.zCollision({
                position: { z },
                height: map.tileHeight
            })) {
                continue
            }
            const hitbox = Hit.createObjectHitbox(nextPosition.x, nextPosition.y, nextPosition.z, this.hitbox.w, this.hitbox.h)
            let collided = Hit.testPolyCollision(shape.type, hitbox, shape.hitbox)
            if (collided) {
                this.collisionWith.push(shape)
                this.triggerCollisionWith() 
                if (collision) return false
            }
        }

        switch (direction) {
            case 'left':
                this.posX = nextPosition.x
                break
            case 'right':
                this.posX = nextPosition.x
                break
            case 'up':
                if (isClimbable) {
                    this.posZ = nextPosition.z + this.speed
                }
                else {
                    this.posY = nextPosition.y
                }
                break
            case 'down':
                if (isClimbable) {
                    this.posZ = nextPosition.z - this.speed
                }
                else {
                    this.posY = nextPosition.y
                }
                break
        }
        
        return true
    }

    changeDirection(direction: Direction) {
        const dir = { 
            down: 0, 
            left: 1, 
            right: 2,
            up: 3
        }
        if (dir[direction] === undefined) return false

        this.direction = dir[direction]
    }

    _syncPlayer() {
        // test player instance for event
        if (this.player) {
            /*this.server.sendToPlayer(this.player, 'updateEvent', {
                id: this.id, 
                x: this.x,
                y: this.y
            })*/
        }
    }

    syncTo(other) {
        super.syncTo(other)
    }

}