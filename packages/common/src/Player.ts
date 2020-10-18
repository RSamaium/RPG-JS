import { DynamicObject, BaseTypes, ThreeVector } from 'lance-gg'
import SAT from 'sat'
import { Hit } from './Hit'
import Map from './Map'

const ACTIONS = { IDLE: 0, RUN: 1, ACTION: 2 }

export default class Player extends DynamicObject<any, any> {

    name: string
    map: string = ''
    graphic: string = ''
    speed: number = 3
    height: number = 0
    width: number = 0
    canMove: number = 1
    events: any[] = []
    direction: number
    colissionWith: any[] = []
    data: any = {}
    hitbox: any
    player: any
    server: any
    position: any

    private _hitboxPos: any

    static get netScheme() {
        return Object.assign({
            direction: { type: BaseTypes.TYPES.INT8 },
            action: { type: BaseTypes.TYPES.INT8 },
            map: { type: BaseTypes.TYPES.STRING },
            speed: { type: BaseTypes.TYPES.INT8 },
            graphic: { type: BaseTypes.TYPES.STRING },
            canMove: { type: BaseTypes.TYPES.INT8 },
            width: { type: BaseTypes.TYPES.INT8 },
            height: { type: BaseTypes.TYPES.INT8 },
            wHitbox: { type: BaseTypes.TYPES.INT8 },
            hHitbox: { type: BaseTypes.TYPES.INT8 }
        }, super.netScheme);
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
                    y: this.position.y
                }
            case 'right':
                return {
                    x: this.position.x + this.speed,
                    y: this.position.y
                }
            case 'up':
                return {
                    x: this.position.x,
                    y: this.position.y - this.speed
                }
            case 'down':
                return {
                    x: this.position.x,
                    y: this.position.y + this.speed
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
        for (let colissionWith of this.colissionWith) {
            if (type == Player.ACTIONS.ACTION) {
                if (colissionWith.onAction) colissionWith.execMethod('onAction', [this])
            }
            else if (colissionWith.onPlayerTouch) colissionWith.execMethod('onPlayerTouch', [this])
        }
    }

    move(direction) {
        this.colissionWith = []

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

        const hitbox = new SAT.Box(new SAT.Vector(nextPosition.x, nextPosition.y), this.hitbox.w, this.hitbox.h)

        const tileColission = (x, y): boolean => {
            const tile = map.getTileByPosition(x,y)
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
            return false
        }

        if (
            tileColission(nextPosition.x, nextPosition.y) || 
            tileColission(nextPosition.x + this.hitbox.w, nextPosition.y) || 
            tileColission(nextPosition.x, nextPosition.y + this.hitbox.h) || 
            tileColission(nextPosition.x + this.hitbox.w, nextPosition.y + this.hitbox.h)
        ) {
            return false
        }

        const events = [...this.gameEngine.world.queryObjects({ instanceType: Player }), ...this.events, ...Object.values(this.gameEngine.events)]
        
        for (let event of events) {
            if (event.object) event = event.object
            if (event.id == this.id) continue
            const collided = Hit.testPolyCollision('box', hitbox, event.hitbox)
            if (collided) {
                this.colissionWith.push(event)
                this.triggerCollisionWith()
                return false
            }
        }

        for (let shape of map.shapes) {
            let collided = Hit.testPolyCollision(shape.type, hitbox, shape.hitbox)
            if (collided) {
                this.colissionWith.push(shape)
                if (shape.properties.colission) return false
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
                this.posY = nextPosition.y
                break
            case 'down':
                this.posY = nextPosition.y
                break
        }
        
        return true
    }

    changeDirection(direction) {
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