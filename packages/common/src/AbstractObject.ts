import { intersection, generateUID, toRadians, isInstanceOf, round } from './Utils'
import { Hit, HitType } from './Hit'
import { RpgShape } from './Shape'
import SAT from 'sat'
import { TileInfo, RpgCommonMap } from './Map'
import { RpgPlugin, HookServer } from './Plugin'
import { GameSide, RpgCommonGame } from './Game'
import { Vector2d, Vector2dZero } from './Vector2d'
import { Box } from './VirtualGrid'
import { Behavior, ClientMode, Direction, MoveClientMode, MoveTo, PlayerType, Position, PositionXY, Tick } from '@rpgjs/types'
import { from, map, mergeMap, Observable, Subject, tap, takeUntil, filter } from 'rxjs'
import { RpgCommonPlayer } from './Player'

const ACTIONS = { IDLE: 0, RUN: 1, ACTION: 2 }

type CollisionOptions = {
    collision?: (event: AbstractObject) => void
    near?: (event: AbstractObject) => void,
    allSearch?: boolean
}

export class AbstractObject {
    map: string = ''
    height: number = 0
    width: number = 0
    speed: number
    direction: number = 3
    moving: boolean = false

    /*
        Properties for move mode
    */
    checkCollision: boolean = true
    clientModeMove: ClientMode = MoveClientMode.ByDirection
    behavior: Behavior = Behavior.Direction

    hitbox: SAT.Box

    inShapes: {
        [shapeId: string]: RpgShape
    } = {}

    disableVirtualGrid: boolean = false

    private shapes: RpgShape[] = []
    private _position: Vector2d
    private _hitboxPos: SAT.Vector
    private collisionWith: AbstractObject[] = []
    private _collisionWithTiles: TileInfo[] = []
    private _collisionWithShapes: RpgShape[] = []

    private destroyMove$: Subject<boolean> = new Subject<boolean>()
    // notifier for destroy
    _destroy$: Subject<void> = new Subject()

    static get ACTIONS() {
        return ACTIONS
    }

    constructor(public gameEngine: RpgCommonGame, public playerId: string) {
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
        if (map && !this.disableVirtualGrid /*&& this.gameEngine.isWorker TODO */) {
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
        if (this.isDestroyed) return
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
                this.updateInVirtualGrid()
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
    * Recovers all the colliding shapes of the current player 
    * 
    * @title Get Collision of shapes
    * @since 3.2.0
    * @readonly
    * @prop { RpgShape[] } shapes
    * @memberof Player
    * @memberof RpgSpriteLogic
    */
    get shapesCollision(): RpgShape[] {
        return this._collisionWithShapes
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
    get otherPlayersCollision(): AbstractObject[] {
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
        this.updateInVirtualGrid()
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
        // If it's greater than 1, round value to reduces bandwidth
        const x = this.speed < 1 ? computePosition('x') : round(computePosition('x'))
        const y = this.speed < 1 ? computePosition('y') : round(computePosition('y'))
        return new Vector2d(x, y, ~~this.position.z)
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
    async triggerCollisionWith(type?: number) {
        let doChanges = false
        for (let collisionWith of this.collisionWith) {
            if (collisionWith.isDestroyed) continue
            if (collisionWith instanceof RpgShape) {
                const goMap = collisionWith.getProperty<string>('go-map')
                if (goMap && 'changeMap' in this) await this.changeMap(goMap)
            }
            else {
                if (type == AbstractObject.ACTIONS.ACTION) {
                    if ('onAction' in collisionWith) {
                        await collisionWith.execMethod('onAction', [this])
                        doChanges = true
                    }
                }
                else if ('onPlayerTouch' in collisionWith) {
                    await collisionWith.execMethod('onPlayerTouch', [this])
                    doChanges = true
                }
            }
        }
        if (this.syncChanges && doChanges) this.syncChanges()
    }

    /** @internal */
    zCollision(other: Pick<AbstractObject, 'height'> & { position: Pick<AbstractObject['position'], 'z'> }): boolean {
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
     * ```ts
     *   {
     *       tiles: [
     *           {
     *               id: 0,
     *               terrain: [],
     *               probability: null,
     *               properties: [Object],
     *               animations: [],
     *               objectGroups: [],
     *               image: null,
     *               gid: 1
     *           }
     *       ],
     *       hasCollision: false,
     *       isOverlay: undefined,
     *       objectGroups: [],
     *       isClimbable: undefined,
     *       tileIndex: 93
     *   }
     * ```
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

    private async collisionObjects(
        playerSizeBox: Box,
        hitbox: SAT.Box,
        triggers?: CollisionOptions
    ): Promise<boolean> {
        const map = this.mapInstance

        if (!map) return true

        const events: { [id: string]: AbstractObject } = this.gameEngine.world.getObjectsOfGroup(this.map, this)
        const objects = map.grid.getObjectsByBox(playerSizeBox)
        let boolFound = false

        for (let objectId of objects) {
            // client side: read "object" property
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

    /** @internal */
    private async collisionWithShape(shape: RpgShape, player: AbstractObject, nextPosition?: Vector2d): Promise<boolean> {
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
        const playerPositionSaved = player.position.copy()

        // Position can changed after enter or exit shape. So, we need to verify if position changed and update if z is changed
        // If X or Y changed, we need to return true, it means that stop the current movement, and apply the new position
        const verifyIfPositionChanged = (): boolean | undefined => {
            if (this.position.z != playerPositionSaved.z && nextPosition) {
                nextPosition.z = this.position.z
            }
            if (this.position.x != playerPositionSaved.x || this.position.y != playerPositionSaved.y) {
                return true
            }
        }

        if (collided) {
            this._collisionWithShapes.push(shape)
            // TODO: in shape after map load
            if (!collision) await shape.in(player)
            if (verifyIfPositionChanged() === true) return true
            this.triggerCollisionWith()
            if (collision) return true
        }
        else {
            await shape.out(player)
            if (verifyIfPositionChanged() === true) return true
        }

        return false
    }

    private async collisionShapes(playerSizeBox: Box, nextPosition?: Vector2d, triggers?: CollisionOptions): Promise<boolean> {
        const map = this.mapInstance
        if (!map) return false
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

        const createObstacle = function (x: number, y: number, radius: number): Vector2d {
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
            collision: (event: AbstractObject) => {
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

    async isCollided(nextPosition: Vector2d, options: CollisionOptions = {}): Promise<boolean> {
        this.collisionWith = []
        this._collisionWithTiles = []
        const prevMapId = this.map
        const hitbox = Hit.createObjectHitbox(nextPosition.x, nextPosition.y, 0, this.hitbox.w, this.hitbox.h)
        const boundingMap = this.mapInstance?.boundingMap(nextPosition, this.hitbox)
        let collided = false

        if (boundingMap?.bounding) {
            this.position.set(nextPosition)
            if (!options.allSearch) return true
            else collided = true
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
            if (!options.allSearch) return true
            else collided = true
        }

        if (this.autoChangeMap && this.type == PlayerType.Player) {
            const changeMap = await this.autoChangeMap(nextPosition)
            if (changeMap) {
                return true
            }
        }

        const playerSizeBox = this.getSizeMaxShape(nextPosition.x, nextPosition.y)

        if (await this.collisionObjects(playerSizeBox, hitbox, options)) {
            if (!options.allSearch) return true
            else collided = true
        }

        if (await this.collisionShapes(playerSizeBox, nextPosition, options)) {
            if (!options.allSearch) return true
            else collided = true
        }

        // if there is a change of map after a move, the moves are not changed
        if (prevMapId != this.map) {
            return true
        }

        return collided
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

    private autoChangeDirection(nextPosition: Vector2d) {
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

    // @internal
    /**
     * We need to know if the event is deleted. Because when the event is deleted, you don't update the positions and you don't send the positions back to the client.
     */
    get isDestroyed(): boolean {
        return !!this._destroy$['_closed']
    }

    /**
    * Stops the movement of the player who moves towards his target
    * 
    * @title Stop Move To
    * @method player.stopMoveTo()
    * @returns {void}
    * @since 3.2.0
    * @memberof MoveManager
    */
    stopMoveTo() {
        if (this.destroyMove$.closed) return
        this.moving = false
        this.destroyMove$.next(true)
        this.destroyMove$.unsubscribe()
    }

    private _lookToward(player: Vector2d, otherPlayer: Vector2d): Direction {
        const { x, y } = player;
        const { x: ox, y: oy } = otherPlayer;
    
        // Calculate the differences between the x and y coordinates.
        const dx = ox - x;
        const dy = oy - y;
    
        // Determine the primary direction based on the relative magnitude
        // of the x and y differences.
        if (Math.abs(dx) > Math.abs(dy)) {
            if (dx > 0) {
                return Direction.Right;
            } else {
                return Direction.Left;
            }
        } else {
            if (dy > 0) {
                return Direction.Down;
            } else {
                return Direction.Up;
            }
        }
    }

    _moveTo(tick$: Observable<Tick>, positionTarget: AbstractObject | RpgShape | PositionXY, options: MoveTo = {}): Observable<Vector2d> {
        let i = 0
        let count = 0
        const lastPositions: Vector2d[] = []
        this.stopMoveTo()
        this.moving = true
        this.destroyMove$ = new Subject()
        const { infinite, onStuck, onComplete } = options
        const getPosition = (): Vector2d => {
            let pos
            if ('x' in positionTarget) {
                pos = new Vector2d(positionTarget.x, positionTarget.y)
            }
            else {
                pos = positionTarget.position
            }
            return pos
        }
        return tick$
            .pipe(
                takeUntil(this.destroyMove$),
                takeUntil(this._destroy$),
                mergeMap(() => from(this.computeNextPositionByTarget(this.position.copy(), getPosition()))),
                filter(() => {
                    return this.isDestroyed === false
                }),
                map((position) => {
                    this.autoChangeDirection(position)
                    return this.position.set(position)
                }),
                tap((position: Vector2d) => {
                    lastPositions[i] = position.copy()
                    i++
                    count++
                    if (i >= 3) {
                        i = 0
                    }
                    if (
                        lastPositions[2] &&
                        (
                            lastPositions[0].isEqual(lastPositions[2]) ||
                            lastPositions[1].isEqual(lastPositions[2]) ||
                            lastPositions[0].isEqual(lastPositions[1])
                        )
                    ) {
                        this.direction = this._lookToward(this.position, getPosition())
                        onStuck?.(count)
                        this.moving = false
                    }
                    else if (this.position.isEqual(getPosition())) {
                        onComplete?.()
                        if (!infinite) {
                            this.stopMoveTo()
                        }
                    }
                    else {
                        count = 0
                        this.moving = true
                    }
                })
            )
    }

    /** @internal */
    async move(nextPosition: Vector2d): Promise<boolean> {
        this.autoChangeDirection(nextPosition)

        const notCollided = !(await this.isCollided(nextPosition))

        if ((notCollided || !this.checkCollision) && !this.isDestroyed) {
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

    getSizeMaxShape(x?: number, y?: number): Box {
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
    async execMethod(methodName: string, methodData?, instance?) { }
}

export interface AbstractObject {
    readonly type: string
    through: boolean
    throughOtherPlayer: boolean
    autoChangeMap?(nextPosition: Position): Promise<boolean>
    execMethod(methodName: string, methodData?, instance?)
    changeMap(mapName: string)
    syncChanges()
}