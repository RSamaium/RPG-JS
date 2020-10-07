import { DynamicObject, BaseTypes } from 'lance-gg'
import SAT from 'sat'
import Map from './Map'

const ACTIONS = { IDLE: 0, RUN: 1, ACTION: 2 }

export default class Player extends DynamicObject<any, any> {

    map: string = ''
    graphic: string = ''
    speed: number = 3
    height: number = 20
    width: number = 20
    canMove: number = 1
    events: any[] = []
    direction: number
    colissionWith: any[] = []
    data: any = {}
    hitbox: any
    player: any
    server: any

    private _hitboxPos: any

    static get netScheme() {
        return Object.assign({
            direction: { type: BaseTypes.TYPES.INT8 },
            action: { type: BaseTypes.TYPES.INT8 },
            map: { type: BaseTypes.TYPES.STRING },
            speed: { type: BaseTypes.TYPES.INT8 },
            graphic: { type: BaseTypes.TYPES.STRING },
            canMove: { type: BaseTypes.TYPES.INT8 }
        }, super.netScheme);
    }

    static get ACTIONS() {
        return ACTIONS;
    }

    constructor(gameEngine, options, props: any = {}) {
        super(gameEngine, options, props)
        this.direction = props.direction || 0
        this.position.x = props.x || 0
        this.position.y = props.y || 0
        this._hitboxPos = new SAT.Vector(this.position.x, this.position.y)
        this.hitbox = new SAT.Box(this._hitboxPos, this.width, this.height)
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

    get bending() {
        return {
            velocity: { percent: 0.0 }
        };
    }

    get mapInstance() {
        return Map.buffer.get(this.map)
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

        const tileColission = (x, y) => {
            const tile = map.getTileByPosition(x,y)
            if (tile.hasColission) {
                return true
            }
        }

        if (tileColission(nextPosition.x, nextPosition.y)) return false
        if (tileColission(nextPosition.x + this.width, nextPosition.y)) return false
        if (tileColission(nextPosition.x, nextPosition.y + this.height)) return false
        if (tileColission(nextPosition.x + this.width, nextPosition.y + this.height)) return false
        
        const events = [...this.gameEngine.world.queryObjects({ instanceType: Player }), ...this.events, ...Object.values(this.gameEngine.events)]
        const hitbox = new SAT.Box(new SAT.Vector(nextPosition.x, nextPosition.y), this.width, this.height)

        for (let event of events) {
            if (event.object) event = event.object
            if (event.id == this.id) continue
            const collided = SAT.testPolygonPolygon(hitbox.toPolygon(), event.hitbox.toPolygon())
            if (collided) {
                this.colissionWith.push(event)
                this.triggerCollisionWith()
                return false
            }
        }

        for (let shape of map.shapes) {
            let collided = false
            switch (shape.type) {
                case 'box':
                    collided = SAT.testPolygonPolygon(hitbox.toPolygon(), shape.hitbox.toPolygon())
                break
                case 'circle':
                    collided = SAT.testPolygonCircle(hitbox.toPolygon(), shape.hitbox)
                break
                case 'polygon':
                    collided = SAT.testPolygonPolygon(hitbox.toPolygon(), shape.hitbox)
                break
            }
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
        this.direction = other.direction
        this.map = other.map
        this.graphic = other.graphic
        this.speed = other.speed
        this.canMove = other.canMove
    }

}