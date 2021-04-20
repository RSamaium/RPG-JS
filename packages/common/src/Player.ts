import { intersection, isString, isBrowser } from './Utils'
import { Hit } from './Hit'
import SAT from 'sat'
import Map from './Map'

const ACTIONS = { IDLE: 0, RUN: 1, ACTION: 2 }

export enum Direction { 
    Up = 'up',
    Down = 'down',
    Left = 'left',
    Right = 'right'
}

export enum PlayerType {
    Player = 'player',
    Event = 'event'
}

export class RpgCommonPlayer {

    map: string = ''
    graphic: string = ''
    height: number = 0
    width: number = 0
    canMove: boolean
    speed: number
    events: any[] = []
    direction: number = 0
    collisionWith: any[] = []
    data: any = {}
    hitbox: any
    vision: any

    private inVision: {
        [playerId: string]: boolean
    } = {}
    private _position: any
    private _hitboxPos: any

    static get ACTIONS() {
        return ACTIONS
    }

    constructor(private gameEngine, public playerId: string) {
        this._hitboxPos = new SAT.Vector(0, 0)
        this.setHitbox(this.width, this.height)
        this.position = { x: 0, y: 0, z: 0 }
    }

    get id() {
        return this.playerId
    }

    set id(str: string) {
        this.playerId = str
    }

    /**
     * Get/Set position x, y and z of player
     * 
     * z is the depth layer. By default, its value is 0. Collisions and overlays will be performed with other objects on the same z-position. 
     * 
     * @title Get/Set position
     * @prop { { x: number, y: number, z: number } } position
     * @memberof Player
     */
    set position(val) {
        this._hitboxPos.x = val.x
        this._hitboxPos.y = val.y
        this._hitboxPos.z = val.z
        this._position = new Proxy(val, {
            get: (target, prop: string) => target[prop], 
            set: (target, prop, value) => {
                this._hitboxPos[prop] = value
                target[prop] = value
                return true
            }
        })
    }

    get position() {
        return this._position
    }

    set posX(val) {
        this.position.x = val
    }

    set posY(val) {
        this.position.y = val
    }

    set posZ(val) {
        this.position.z = val
    }

    get mapInstance(): Map {
        return Map.buffer.get(this.map)
    }

    /**
     * Define the size of the player. You can set the hitbox for collisions
     * 
     * ```ts
     * player.setSizes({
     *      width: 32,
     *      height: 32
     * })
     * ```
     * 
     * and with hitbox:
     * 
     *  ```ts
     * player.setSizes({
     *      width: 32,
     *      height: 32,
     *      hitbox: {
     *          width: 20,
     *          height: 20
     *      }
     * })
     * ```
     * 
     * @title Set Sizes
     * @method player.setSizes(key,value)
     * @param { { width: number, height: number, hitbox?: { width: number, height: number } } } obj
     * @returns {void}
     * @memberof Player
     */
    setSizes(obj: { width: number, height: number, hitbox?: { width: number, height: number } }): void {
        this.width = obj.width 
        this.height = obj.height
        if (obj.hitbox) {
            this.setHitbox(obj.hitbox.width, obj.hitbox.height)
        }
    }

    /**
     * Define the hitbox of the player.
     * 
     * ```ts
     * player.setHitbox({
     *      width: 20,
     *      height: 20
     * })
     * ```
     * 
     * @title Set Hitbox
     * @method player.setHitbox(width,height)
     * @param {number} width
     * @param {number} height
     * @returns {void}
     * @memberof Player
     */
    setHitbox(width: number, height: number): void {
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

    get visionHitbox() {
        if (!this.vision.type) return null
        const x = this.position.x - (this.vision.width / 2 - this.wHitbox / 2)
        const y = this.position.y -(this.vision.height / 2 - this.hHitbox / 2)
        return Hit.getHitbox({
            ...this.vision,
            x,
            y
        })
    }
    
    defineNextPosition(direction) {
        switch (direction) {
            case Direction.Left:
                return {
                    x: this.position.x - this.speed,
                    y: this.position.y,
                    z: this.position.z
                }
            case Direction.Right:
                return {
                    x: this.position.x + this.speed,
                    y: this.position.y,
                    z: this.position.z
                }
            case Direction.Up:
                return {
                    x: this.position.x,
                    y: this.position.y - this.speed,
                    z: this.position.z
                }
            case Direction.Down:
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
            if (type == RpgCommonPlayer.ACTIONS.ACTION) {
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

    move(direction: Direction): boolean {
        this.collisionWith = []

        this.changeDirection(direction)

        const nextPosition = this.defineNextPosition(direction)
        const map: Map = this.mapInstance

        const hitbox = Hit.createObjectHitbox(nextPosition.x, nextPosition.y, 0, this.hitbox.w, this.hitbox.h)

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
        if (nextPosition.x > map.widthPx - this.hitbox.w) {
            this.posX = map.widthPx - this.hitbox.w
            return false
        }
        if (nextPosition.y > map.heightPx - this.hitbox.h) {
            this.posY = map.heightPx - this.hitbox.h
            return false
        }

        let isClimbable = false

        const tileCollision = (x, y): boolean => {
            const tile = map.getTileByPosition(x, y, [nextPosition.z, this.height])
            const tilePos = map.getTileOriginPosition(x, y)
            if (tile.hasCollision) {
                return true
            }
            else if (tile.objectGroups) {
                
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

        let events: RpgCommonPlayer[] = this.gameEngine.world.getObjectsOfGroup(this.map, this)

        const inArea = (player1: RpgCommonPlayer, player2: RpgCommonPlayer) => {
            if (player1.vision && player1.vision.type) {
                const playerInVision = Hit.testPolyCollision('box', player2.hitbox, player1.visionHitbox?.hitbox)
                if (playerInVision && !player1.inVision[player2.id]) {
                    player1.inVision[player2.id] = true
                    player1.execMethod('onInVision', [player2])
                }
                if (!playerInVision && player1.inVision[player2.id]) {
                    delete player1.inVision[player2.id]
                    player1.execMethod('onOutVision', [player2])
                }
            }
        }

        for (let event of events) {
            if (event.id == this.id) continue
            if (!this.zCollision(event)) continue
            const collided = Hit.testPolyCollision('box', hitbox, event.hitbox)
            
            inArea(event, this)
            inArea(this, event)
            
            if (collided) {
                this.collisionWith.push(event)
                this.triggerCollisionWith()
                let throughOtherPlayer = false
                if (event.type == PlayerType.Player && this.type == PlayerType.Player) {
                    if (!(event.throughOtherPlayer || this.throughOtherPlayer)) {
                        return false
                    }
                    else {
                        throughOtherPlayer = true
                    }
                }
                if (!throughOtherPlayer && (!(event.through || this.through))) return false 
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
        this.position = nextPosition
        return true
    }

     /**
     * Get the current direction.
     * 
     * ```ts
     * player.getDirection()
     * ```
     * 
     * @title Get Direction
     * @method player.getDirection()
     * @returns {string} left, right, up or down
     * @memberof Player
     */
    getDirection(direction?: Direction | number): string | number {
        const currentDir = direction || this.direction
        if (!isString(currentDir)) {
            return [Direction.Down, Direction.Left, Direction.Right, Direction.Up][currentDir]
        }
        const dir = { 
            [Direction.Down]: 0, 
            [Direction.Left]: 1, 
            [Direction.Right]: 2,
            [Direction.Up]: 3
        }
        return dir[currentDir]
    }

     /**
     * Changes the player's direction
     * 
     * ```ts
     * import { Direction } from '@rpgjs/server'
     * 
     * player.changeDirection(Direction.Left)
     * ```
     * 
     * @title Change direction
     * @method player.changeDirection(direction)
     * @param {Direction} direction
     * @enum {string}
     * 
     * Direction.Left | left
     * Direction.Right | right
     * Direction.Up | up
     * Direction.Down | down
     * @returns {boolean} the direction has changed
     * @memberof Player
     */
    changeDirection(direction: Direction): boolean {
        const dir = +this.getDirection(direction)
        if (dir === undefined) return false
        this.direction = dir
        return true
    }

    /**
     * Gets the necessary number of pixels to allow the player to cross a tile. 
     * This is the ratio between the height or width of the tile and the speed of the player.
     */
    get nbPixelInTile(): any {
        const direction = this.getDirection()
        switch (direction) {
            case Direction.Down:
            case Direction.Up:
                return this.mapInstance.tileHeight / this.speed
            case Direction.Left:
            case Direction.Right:
                return this.mapInstance.tileWidth / this.speed
            default: 
                return NaN
        }
    }

    execMethod(methodName: string, methodData: any = []) {}
}

export interface RpgCommonPlayer {
    readonly type: string
    through: boolean
    throughOtherPlayer: boolean
}