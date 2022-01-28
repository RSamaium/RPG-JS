import { intersection, isString, isBrowser, generateUID } from './Utils'
import { Hit, HitObject } from './Hit'
import { RpgShape } from './Shape'
import SAT from 'sat'
import Map, { TileInfo } from './Map'
import { RpgPlugin } from './Plugin'
import { HookServer } from '.'

const ACTIONS = { IDLE: 0, RUN: 1, ACTION: 2 }

export type Position = { x: number, y: number, z: number }

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
    private collisionWith: any[] = []
    private _collisionWithTiles: TileInfo[] = []
    data: any = {}
    hitbox: any
    
    inShapes: {
        [shapeId: string]: RpgShape
    } = {}

    private shapes: RpgShape[] = []

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
    set position(val: Position) {
        const { x, y, z } = val
        this._hitboxPos.x = x
        this._hitboxPos.y = y
        this._hitboxPos.z = z
        if (this.steerable) {
            this.steerable.position.copy(this.getVector3D(x, z, y))
        }
        this._position = new Proxy(val, {
            get: (target, prop: string) => target[prop], 
            set: (target, prop, value) => {
                this._hitboxPos[prop] = value
                if (this.steerable) {
                    this.steerable[prop] = value
                }
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
     * 
     * Recovers all the colliding tiles of the current player 
     * 
     * @title Get Collision of tiles
     * @since 3.0.0-beta.4
     * @readonly
     * @prop { TileInfo[] } tiles
     * @memberof Player
     * @memberof RpgSpriteLogic
     */
    get tilesCollision(): TileInfo[] {
        return this._collisionWithTiles
    }

    /**
     * 
     * Recovers all other players and events colliding with the current player's hitbox
     * 
     * @title Get Collision of other players/events
     * @since 3.0.0-beta.4
     * @readonly
     * @prop { (RpgPlayer | Rpgvent)[] } otherPlayersCollision
     * @memberof Player
     * @memberof RpgSpriteLogic
     */
    get otherPlayersCollision(): RpgCommonPlayer[] {
        return this.collisionWith
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
     * @deprecated
     * @returns {void}
     * @memberof Player
     */
    setSizes(obj: { width: number, height: number, hitbox?: { width: number, height: number } }): void {
        this.width = obj.width 
        this.height = obj.height
        if (obj.hitbox) {
            this.hitbox = new SAT.Box(this._hitboxPos, obj.hitbox.width, obj.hitbox.height)
        }
    }

    /**
     * Define the hitbox of the player.
     * 
     * ```ts
     * player.setHitbox(20, 20)
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
        const map = this.mapInstance
        if (map) {
            this.width = map.tileWidth 
            this.height = map.tileHeight
        }
        this.hitbox = new SAT.Box(this._hitboxPos, width, height)
        this.wHitbox = width
        this.hHitbox = height
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
    
    defineNextPosition(direction): Position {
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

    moveByDirection(direction: Direction): boolean {
        const nextPosition = this.defineNextPosition(direction)
        return this.move(nextPosition)
    }

    /**
     * Retrieves a tile and checks if the player has a collision
     * 
     * ```ts
     * const tileInfo = player.getTile(20, 30)
     * console.log(tileInfo)
     * ```
     * 
     * Example of returns: 
     * 
     ```ts
        {
            tiles: [
                {
                    id: 0,
                    terrain: [],
                    probability: null,
                    properties: [Object],
                    animations: [],
                    objectGroups: [],
                    image: null,
                    gid: 1
                }
            ],
            hasCollision: false,
            isOverlay: undefined,
            objectGroups: [],
            isClimbable: undefined,
            tileIndex: 93
        }
        ```
     * 
     * @title Get Tile
     * @since 3.0.0-beta.4
     * @method player.getTile(x,y,z?)
     * @param {number} x
     * @param {number} y
     * @param {number} [z]
     * @returns {object}
     * @memberof Player
     * @memberof RpgSpriteLogic
     */
    getTile(x: number, y: number, z: number = 0, hitbox?: SAT.Box): TileInfo {
        const map: Map = this.mapInstance
        return map.getTile(hitbox || this.hitbox, x, y, [z, this.height])
    }

    isCollided(nextPosition: Position): boolean {
        this.collisionWith = []
        this._collisionWithTiles = []

        const map: Map = this.mapInstance
        const hitbox = Hit.createObjectHitbox(nextPosition.x, nextPosition.y, 0, this.hitbox.w, this.hitbox.h)

        if (!map) {
            return true
        }
        if (nextPosition.x < 0) {
            this.posX = 0 
            return true
        }
        if (nextPosition.y < 0) {
            this.posY = 0 
            return true
        }
        if (nextPosition.x > map.widthPx - this.hitbox.w) {
            this.posX = map.widthPx - this.hitbox.w
            return true
        }
        if (nextPosition.y > map.heightPx - this.hitbox.h) {
            this.posY = map.heightPx - this.hitbox.h
            return true
        }

        const tileCollision = (x, y): boolean => {
            const tile = this.getTile(x, y, nextPosition.z, hitbox)
            if (tile.hasCollision) {
                this._collisionWithTiles.push(tile)
                return true
            }
            return false
        }

        if (
            tileCollision(nextPosition.x, nextPosition.y) || 
            tileCollision(nextPosition.x + this.hitbox.w, nextPosition.y) || 
            tileCollision(nextPosition.x, nextPosition.y + this.hitbox.h) || 
            tileCollision(nextPosition.x + this.hitbox.w, nextPosition.y + this.hitbox.h)
        ) {
            return true
        }
        let events: RpgCommonPlayer[] = this.gameEngine.world.getObjectsOfGroup(this.map, this)

        for (let event of events) {
            if (event.id == this.id) continue
            if (!this.zCollision(event)) continue
            const collided = Hit.testPolyCollision('box', hitbox, event.hitbox)
            
            for (let shape of this.shapes) {
                this.collisionWithShape(shape, event)
            }

            for (let shape of event.shapes) {
                event.collisionWithShape(shape, this)
            }
            
            if (collided) {
                this.collisionWith.push(event)
                this.triggerCollisionWith()
                let throughOtherPlayer = false
                if (event.type == PlayerType.Player && this.type == PlayerType.Player) {
                    if (!(event.throughOtherPlayer || this.throughOtherPlayer)) {
                        return true
                    }
                    else {
                        throughOtherPlayer = true
                    }
                }
                if (!throughOtherPlayer && (!(event.through || this.through))) return true 
            }
        }

        const shapes = map.getShapes()
        for (let shape of shapes) {
            const bool = this.collisionWithShape(shape, this, nextPosition)
            if (bool) return true
        }

        return false
    }

    /**
     * Attach a shape to the player (and allow interaction with it)
     * 
     * ```ts
     * import { ShapePositioning } from '@rpgjs/server'
     * 
     * player.attachShape({
     *      width: 100,
     *      height: 100,
     *      positioning: ShapePositioning.Center
     * })
     * ```
     * 
     * @title Attach Shape
     * @method player.attachShape(parameters)
     * @param { { width: number, height: number, positioning?, name?, properties?: object } } obj
     * - positioning: Indicate where the shape is placed.
     * - properties: An object in order to retrieve information when interacting with the shape
     * - name: The name of the shape
     * @since 3.0.0-beta.3
     * @returns {RpgShape}
     * @memberof Player
     */
    attachShape(obj: { 
        width: number, 
        height: number 
        positioning?: string
        name?: string
        properties?: object
    }): RpgShape {
        obj.name = (obj.name || generateUID()) as string
        const shape = new RpgShape({
            ...obj,
            fixEvent: this
        } as any)
        this.shapes.push(shape)
        return shape
    }

    /**
     * Returns all shapes assigned to this player
     * 
     * @title Get Shapes
     * @method player.getShapes()
     * @returns {RpgShape[]}
     * @since 3.0.0-beta.3
     * @memberof Player
     * @memberof RpgSpriteLogic
     */
    getShapes(): RpgShape[] {
        return this.shapes
    }

    collisionWithShape(shape: RpgShape, player: RpgCommonPlayer, nextPosition?: Position): boolean {
        const { collision, z } = shape.properties
        if (shape.isShapePosition()) return false
        if (z !== undefined && !this.zCollision({
            position: { z },
            height: this.mapInstance.tileHeight
        })) {
            return false
        }
        let { position, hitbox } = player
        if (nextPosition) position = nextPosition
        const hitboxObj = Hit.createObjectHitbox(
            position.x, 
            position.y, 
            position.z, 
            hitbox.w, 
            hitbox.h
        )
        let collided = Hit.testPolyCollision(shape.type, hitboxObj, shape.hitbox)
        if (collided) {
            this.collisionWith.push(shape)
            // TODO: in shape after map load
            if (!collision) shape.in(this)
            this.triggerCollisionWith()
            if (collision) return true
        }
        else {
            shape.out(this)
        }

        return false
    }

    move(nextPosition: Position, testCollision:  boolean = true): boolean {
        {
            const { x, y } = this.position
            const { x: nx, y: ny } = nextPosition
            if (Math.abs(x - nx) > Math.abs(y - ny)) {
                if (nx > x) {
                    this.changeDirection(Direction.Right)
                }
                else {
                    this.changeDirection(Direction.Left)
                }
            }
            else {
                if (ny > y) {
                    this.changeDirection(Direction.Down)
                }
                else {
                    this.changeDirection(Direction.Up)
                }
            }
        }

        const collided = testCollision && !this.isCollided(nextPosition)

        if (collided) {
            this.position = nextPosition
            RpgPlugin.emit(HookServer.PlayerMove, this)
        }

        return true
    }

    /**
     * Retrieves all shapes where the player is located
     * 
     * @title Get In-Shapes
     * @method player.getInShapes()
     * @returns {RpgShape[]}
     * @since 3.0.0-beta.3
     * @memberof Player
     */
    getInShapes(): RpgShape[] {
        return Object.values(this.inShapes)
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

    execMethod(methodName: string, methodData?, instance?) {}
}

export interface RpgCommonPlayer {
    readonly type: string
    through: boolean
    throughOtherPlayer: boolean
    steerable: any
    getVector3D(x, y, z): any
    execMethod(methodName: string, methodData?, instance?)
}