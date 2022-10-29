import { intersection, generateUID, toRadians, isInstanceOf } from './Utils'
import { Hit, HitType } from './Hit'
import { RpgShape } from './Shape'
import SAT from 'sat'
import { TileInfo, RpgCommonMap } from './Map'
import { RpgPlugin, HookServer } from './Plugin'
import { GameSide, RpgCommonGame } from './Game'
import { Vector2d, Vector2dZero } from './Vector2d'
import { Box } from './VirtualGrid'
import { Behavior, ClientMode, MoveClientMode, PlayerType } from '@rpgjs/types'

const ACTIONS = { IDLE: 0, RUN: 1, ACTION: 2 }

export type Position = { x: number, y: number, z: number }

export enum Direction { 
    Up = 1,
    Down = 3,
    Left = 4,
    Right = 2,
    UpRight = 1.5,
    DownRight = 2.5,
    DownLeft = 3.5,
    UpLeft =  2.5
}

export const LiteralDirection =  {
    1: 'up',
    2: 'right',
    3: 'down',
    4: 'left'
}

export class RpgCommonPlayer {
    map: string = ''
    layerName: string = ''
    components: any[] = []
    height: number = 0
    width: number = 0
    speed: number
    events: any[] = []
    direction: number = 3
    private collisionWith: RpgCommonPlayer[] = []
    private _collisionWithTiles: TileInfo[] = []
    private _collisionWithShapes: RpgShape[] = []
    
    /*
        Properties for move mode
    */
    checkCollision: boolean = true
    clientModeMove: ClientMode = MoveClientMode.ByDirection
    behavior: Behavior = Behavior.Direction


    /** @internal */
    data: any = {}
    hitbox: SAT.Box
    pendingMove: { input: string, frame: number }[] = []
    //modeMove: ModeMove = ModeMove.Direction
    
     /** 
     * Display/Hide the GUI attached to this sprite
     * 
     * @prop {boolean} guiDisplay
     * @since 3.0.0-beta.5
     * @memberof RpgSprite
     * */
    guiDisplay: boolean
    
    inShapes: {
        [shapeId: string]: RpgShape
    } = {}

    private shapes: RpgShape[] = []

    private _position: Vector2d
    private _hitboxPos: any

    static get ACTIONS() {
        return ACTIONS
    }

    constructor(private gameEngine: RpgCommonGame, public playerId: string) {
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

    updateInVirtualGrid() {
        const map = this.mapInstance
        if (map /*&& this.gameEngine.isWorker TODO */) {
            map.grid.insertInCells(this.id, this.getSizeMaxShape())
        }
    }

    get canMove(): boolean {
        return this.clientModeMove == MoveClientMode.ByDirection
    }

    set canMove(val: boolean) {
        this.clientModeMove = val ? MoveClientMode.ByDirection : MoveClientMode.Disabled
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
    set position(val: Position | Vector2d) {
        const { x, y, z } = val
        if (!isInstanceOf(val, Vector2d)) {
            val = new Vector2d(x, y, z)
        }
        this._hitboxPos.x = x
        this._hitboxPos.y = y
        this._hitboxPos.z = z
        this.updateInVirtualGrid()
        this._position = new Proxy<Vector2d>(val as Vector2d, {
            get: (target, prop: string) => target[prop], 
            set: (target, prop, value) => {
                this._hitboxPos[prop] = value
                target[prop] = value
                return true
            }
        })
    }

    get position(): Vector2d {
        return this._position
    }

    get worldPositionX(): number {
        let x = this.position.x
        if (this.mapInstance) {
            x += this.mapInstance.worldX
        }
        return x
    }

    get worldPositionY(): number {
        let y = this.position.y
        if (this.mapInstance) {
            y += this.mapInstance.worldY
        }
        return y
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

    /** @internal */
    get mapInstance(): RpgCommonMap {
        if (this.gameEngine.side == GameSide.Client) {
            return RpgCommonMap.bufferClient.get(this.map)
        }
        return RpgCommonMap.buffer.get(this.map)
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
     * @prop { (RpgPlayer | RpgEvent)[] } otherPlayersCollision
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

    private directionToAngle(direction: number): number {
        const angle = (direction < 2 ? +direction + 2 : direction - 2) * 90
        return toRadians(angle)
    }
    
    /** @internal */
    defineNextPosition(direction: number, deltaTimeInt: number): Vector2d {
        const angle = this.directionToAngle(direction)
        const computePosition = (prop: string) => {
            return this.position[prop] + this.speed * deltaTimeInt 
                * (Math.round(Math[prop == 'x' ? 'cos' : 'sin'](angle) * 100) / 100)
        }
        return new Vector2d(~~computePosition('x'), ~~computePosition('y'), ~~this.position.z)
    }

    /** @internal */
    setPosition({ x, y, tileX, tileY }, move = true) {
        const { tileWidth, tileHeight } = this.mapInstance
        if (x !== undefined) this.posX = x 
        if (y !== undefined) this.posY = y 
        if (tileX !== undefined) this.posX = tileX * tileWidth
        if (tileY !== undefined) this.posY = tileY * tileHeight
    }

    /** @internal */
    triggerCollisionWith(type?: number) {
        for (let collisionWith of this.collisionWith) {
            if (collisionWith instanceof RpgShape) {
                const goMap = collisionWith.getProperty<string>('go-map')
                if (goMap && 'changeMap' in this) this.changeMap(goMap)
            }
            else {
                if (type == RpgCommonPlayer.ACTIONS.ACTION) {
                    if ('onAction' in collisionWith) collisionWith.execMethod('onAction', [this])
                }
                else if ('onPlayerTouch' in collisionWith) collisionWith.execMethod('onPlayerTouch', [this])
            }
        }
    }

    /** @internal */
    zCollision(other): boolean {
        const z = this.position.z
        const otherZ = other.position.z
        return intersection([z, z + this.height], [otherZ, otherZ + other.height])
    }

    /** @internal */
    moveByDirection(direction: Direction, deltaTimeInt: number): Promise<boolean> {
        const nextPosition = this.defineNextPosition(direction, deltaTimeInt)
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
        const map = this.mapInstance
        return map.getTile(hitbox || this.hitbox, x, y, [z, this.height])
    }

    private boundingMap(nextPosition: Vector2d): { bounding: boolean, nextPosition: Vector2d } | null {
        const map = this.mapInstance 
        let bounding = false
        if (!map) {
            return null
        }
        else if (nextPosition.x < 0) {
            nextPosition.x = 0
            bounding = true
        }
        else if (nextPosition.y < 0) {
            nextPosition.y = 0
            bounding = true
        }
        else if (nextPosition.x > map.widthPx - this.hitbox.w) {
            nextPosition.x = map.widthPx - this.hitbox.w
            bounding = true
        }
        else if (nextPosition.y > map.heightPx - this.hitbox.h) {
            nextPosition.y = map.heightPx - this.hitbox.h
            bounding = true
        }
        return {
            bounding,
            nextPosition
        }
    }

    private async collisionObjects(
        playerSizeBox: Box, 
        hitbox: SAT.Box, 
        triggers?: {
            collision?: (event: RpgCommonPlayer) => void
            near?: (event: RpgCommonPlayer) => void,
            allSearch?: boolean
        }
    ): Promise<boolean> {
        const map = this.mapInstance

        if (!map) return true

        const events: { [id: string]: RpgCommonPlayer } = this.gameEngine.world.getObjectsOfGroup(this.map, this)
        const objects = map.grid.getObjectsByBox(playerSizeBox)
        let boolFound = false

        for (let objectId of objects) {
            // client side: read "object" propertie
            if (!events[objectId]) continue
            const event = events[objectId]['object'] || events[objectId] 

            if (event.id == this.id) continue
            if (!this.zCollision(event)) continue

            const collided = Hit.testPolyCollision(HitType.Box, hitbox, event.hitbox)
 
            for (let shape of this.shapes) {
                await this.collisionWithShape(shape, event)
            }

            for (let shape of event.shapes) {
                await event.collisionWithShape(shape, this)
            }

            if (triggers?.near) triggers.near(event)
            
            if (collided) { 
                this.collisionWith.push(event)
                this.triggerCollisionWith()
                let throughOtherPlayer = false
                if (event.type == PlayerType.Player && this.type == PlayerType.Player) {
                    if (!(event.throughOtherPlayer || this.throughOtherPlayer)) {
                        boolFound = true
                        if (!triggers?.allSearch) return true
                    }
                    else {
                        throughOtherPlayer = true
                    }
                }
                if (!throughOtherPlayer && (!(event.through || this.through))) {
                    boolFound = true
                    if (!triggers?.allSearch) return true
                }
            }

            if (boolFound) {
                if (triggers?.collision) triggers.collision(event)
            }
        }

        return boolFound
    }

    private async collisionShapes(playerSizeBox: Box, nextPosition?: Vector2d, triggers?: {
        collision?: (shape: RpgShape) => void
        near?: (shape: RpgShape) => void
        allSearch?: boolean
    }): Promise<boolean> {
        const map = this.mapInstance
        const shapes: { [id: string]: RpgShape } = this.gameEngine.world.getShapesOfGroup(this.map)
        const shapesInGrid = this.gameEngine.side == GameSide.Client 
            ? new Set(Object.keys(shapes)) 
            : map.gridShapes.getObjectsByBox(playerSizeBox)
        let boolFound = false

        for (let shapeId of shapesInGrid) {
            const shape = shapes[shapeId]['object'] || shapes[shapeId]
            if (triggers?.near) triggers.near(shape)
            const bool = await this.collisionWithShape(shape, this, nextPosition)
            if (bool) {
                if (triggers?.collision) triggers.collision(shape)
                boolFound = true
                if (!triggers?.allSearch) return true
            }
        }
        return boolFound
    }

    async computeNextPositionByTarget(nextPosition: Vector2d, target: Vector2d): Promise<Vector2d> {
        const pullDistance = target.distanceWith(nextPosition)
        if (pullDistance <= this.speed) {
            return nextPosition.set(target)
        }
        const pull = (target.copy().subtract(nextPosition)).multiply((1 / pullDistance))
        const totalPush = new Vector2dZero()
        let contenders = 0
        const hitbox = Hit.createObjectHitbox(nextPosition.x, nextPosition.y, nextPosition.z, this.hitbox.w, this.hitbox.h)

        const createObstacle = function(x: number, y: number, radius: number): Vector2d {
            const obstacle = new Vector2d(x, y)
            let push = nextPosition.copy().subtract(obstacle)
            let distance = (nextPosition.distanceWith(obstacle) - radius) - radius;
            if (distance < radius * 2 * 10) {
                ++contenders
                if (distance < 0.0001) distance = 0.0001 // avoid div by 0
                let weight = 1 / distance;
                totalPush.add(push.multiply(weight))
            }
            return obstacle
        }

        const area = this.mapInstance.tileheight * 2
        this.mapInstance.gridTiles.getCells({
            minX: nextPosition.x - area,
            maxX: nextPosition.x + area,
            minY: nextPosition.y - area,
            maxY: nextPosition.y + area
        }, (index) => {
            if (index < 0) return
            const pos = this.mapInstance.getTilePosition(index)
            const hitbox = Hit.createObjectHitbox(pos.x, pos.y, nextPosition.z, this.hitbox.w, this.hitbox.h)
            const radius = this.mapInstance.tilewidth / 2
            const tile = this.getTile(pos.x, pos.y, nextPosition.z, hitbox)
              if (tile.hasCollision) {
                createObstacle(pos.x, pos.y, radius)
            }
        })

        const playerSizeBox = this.getSizeMaxShape(nextPosition.x, nextPosition.y)

        await this.collisionObjects(playerSizeBox, hitbox, {
            collision: (event: RpgCommonPlayer) => {
                const { x, y } = event.position
                createObstacle(x, y, event.hitbox.w)
            },
            allSearch: true
        })

        await this.collisionShapes(playerSizeBox, nextPosition, {
            collision: (shape) => {
                const { x, y } = shape.position
                createObstacle(x, y, shape.hitbox.w)
            },
            allSearch: true
        })

        pull
            .multiply(Math.max(1, 4 * contenders))
            .add(totalPush)
            .normalize()

        return nextPosition.add(pull.multiply(this.speed))
    }

    async isCollided(nextPosition: Vector2d): Promise<boolean> {
        this.collisionWith = [] 
        this._collisionWithTiles = []
        const prevMapId = this.map
        const hitbox = Hit.createObjectHitbox(nextPosition.x, nextPosition.y, 0, this.hitbox.w, this.hitbox.h)
        const boundingMap = this.boundingMap(nextPosition)

        if (boundingMap?.bounding) {
            this.position.set(nextPosition)
            return true
        }
        
        const tileCollision = (x: number, y: number): boolean => {
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

        if (this.autoChangeMap) {
            const changeMap = await this.autoChangeMap(nextPosition)
            if (changeMap) {
                return true
            }
        }

        const playerSizeBox = this.getSizeMaxShape(nextPosition.x, nextPosition.y)
        
        if (await this.collisionObjects(playerSizeBox, hitbox)) return true
        if (await this.collisionShapes(playerSizeBox, nextPosition)) return true

        // if there is a change of map after a move, the moves are not changed
        if (prevMapId != this.map) {
            return true
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

    /** @internal */
    private async collisionWithShape(shape: RpgShape, player: RpgCommonPlayer, nextPosition?: Vector2d): Promise<boolean> {
        const collision = shape.hasCollision
        const z = shape.z
        if (shape.isShapePosition()) return false
        if (z !== undefined && !this.zCollision({
            position: { z },
            height: this.mapInstance.zTileHeight
        })) {
            return false
        }
        let position: Vector2d
        let { hitbox } = player
        if (nextPosition) {
            position = nextPosition.copy()
        }
        else {
            position = player.position.copy()
        }
        const hitboxObj = Hit.createObjectHitbox(
            position.x, 
            position.y, 
            position.z, 
            hitbox.w, 
            hitbox.h
        )
        let collided = Hit.testPolyCollision(shape.type, hitboxObj, shape.hitbox)
        if (collided) {
            this._collisionWithShapes.push(shape)
            // TODO: in shape after map load
            if (!collision) await shape.in(this)
            this.triggerCollisionWith()
            if (collision) return true
        }
        else {
            await shape.out(this)
        }

        return false
    }

    /** @internal */
    async move(nextPosition: Vector2d): Promise<boolean> {
        {
            const { x, y } = this.position
            const { x: nx, y: ny } = nextPosition
            const diff = Math.abs(x - nx) > Math.abs(y - ny)
            if (diff) {
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

        const notCollided = !(await this.isCollided(nextPosition))

        if (notCollided || !this.checkCollision) {
            this.position = nextPosition.copy()
            await RpgPlugin.emit(HookServer.PlayerMove, this)
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
     * @returns {Direction | number} direction
     * @memberof Player
     */
    getDirection(direction?: Direction | number): string | number {
        return direction || this.direction
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
                return Math.floor(this.mapInstance.tileHeight / this.speed)
            case Direction.Left:
            case Direction.Right:
                return Math.floor(this.mapInstance.tileWidth / this.speed)
            default: 
                return NaN
        }
    }

    /** @internal */
    getSizeMaxShape(x?: number, y?: number): { minX: number, minY: number, maxX: number, maxY: number } {
        const _x = x || this.position.x
        const _y = y || this.position.y
        let minX = _x
        let minY = _y
        let maxX = _x + this.wHitbox
        let maxY = _y + this.hHitbox
        const shapes = this.getShapes()
        for (let shape of shapes) {
            if (shape.x < minX) minX = shape.x
            if (shape.y < minY) minY = shape.y
            const shapeMaxX = shape.x + shape.width
            const shapeMaxY = shape.y + shape.height
            if (shapeMaxX > maxX) maxX = shapeMaxX
            if (shapeMaxY > maxY) maxY = shapeMaxY
        }
        return {
            minX,
            minY,
            maxX,
            maxY
        }
    }

    /** @internal */
    async execMethod(methodName: string, methodData?, instance?) {}
    /** @internal */
    onAction() {}
    /** @internal */
    onPlayerTouch() {}
}

export interface RpgCommonPlayer {
    readonly type: string
    through: boolean
    throughOtherPlayer: boolean
    autoChangeMap?(nextPosition: Position): Promise<boolean>
    execMethod(methodName: string, methodData?, instance?)
    changeMap(mapName: string)
}