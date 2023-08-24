import { Direction, LiteralDirection, RpgShape, Vector2d } from '@rpgjs/common'
import { Utils } from '@rpgjs/common'
import { Behavior, ClientMode, MoveMode, MoveTo, PositionXY, SocketEvents, SocketMethods, Tick } from '@rpgjs/types'
import { Observable, Subscription, takeUntil, Subject, tap, switchMap, of, from, debounceTime } from 'rxjs'
import { RpgServerEngine } from '../server'
import { RpgEvent, RpgPlayer } from './Player'

const {
    arrayFlat,
    random,
    isFunction,
    capitalize
} = Utils

function wait(sec: number) {
    return new Promise((resolve) => {
        setTimeout(resolve, sec * 1000)
    })
}

type CallbackTileMove = (player: RpgPlayer, map) => Direction[]
type CallbackTurnMove = (player: RpgPlayer, map) => string
type Routes = (string | Promise<any> | Direction | Direction[] | Function)[]

export enum Frequency {
    Lowest = 600,
    Lower = 400,
    Low = 200,
    High = 100,
    Higher = 50,
    Highest = 25,
    None = 0
}

export enum Speed {
    Slowest = 0.2,
    Slower = 0.5,
    Slow = 1,
    Normal = 3,
    Fast = 5,
    Faster = 7,
    Fastest = 10
}

/** 
* @title Move
* @enum {Object}
* 
* Move.right(repeat=1) | Movement of a number of pixels on the right
* Move.left(repeat=1) | Movement of a number of pixels on the left 
* Move.up(repeat=1) | Movement of a number of pixels on the up
* Move.down(repeat=1) | Movement of a number of pixels on the down
* Move.random(repeat=1) | Movement of a number of pixels in a random direction
* Move.towardPlayer(player, repeat=1) | Moves a number of pixels in the direction of the designated player
* Move.awayFromPlayer(player, repeat=1) | Moves a number of pixels in the opposite direction of the designated player
* Move.tileRight(repeat=1) | Movement of a number of tiles on the right
* Move.tileLeft(repeat=1) | Movement of a number of tiles on the left
* Move.tileUp(repeat=1) | Movement of a number of tiles on the up
* Move.tileDown(repeat=1) | Movement of a number of tiles on the down
* Move.tileRandom(repeat=1) | Movement of a number of tiles in a random direction
* Move.tileTowardPlayer(player, repeat=1) | Moves a number of tiles in the direction of the designated player
* Move.tileAwayFromPlayer(player, repeat=1) | Moves a number of tiles in the opposite direction of the designated player
* Move.turnRight() | Turn to the right
* Move.turnLeft() | Turn to the left
* Move.turnUp() | Turn to the up
* Move.turnDown() | Turn to the down
* Move.turnRandom() | Turn to random direction
* Move.turnAwayFromPlayer(player) | Turns in the opposite direction of the designated player
* Move.turnTowardPlayer(player) | Turns in the direction of the designated player
* @memberof Move
* */
class MoveList {

    repeatMove(direction: Direction, repeat: number): Direction[] {
        return new Array(repeat).fill(direction)
    }

    private repeatTileMove(direction: string, repeat: number, propMap: string): CallbackTileMove {
        return (player: RpgPlayer, map): Direction[] => {
            const repeatTile = Math.floor(map[propMap] / player.speed) * repeat
            return this[direction](repeatTile)
        }
    }

    right(repeat: number = 1): Direction[] {
        return this.repeatMove(Direction.Right, repeat)
    }

    left(repeat: number = 1): Direction[] {
        return this.repeatMove(Direction.Left, repeat)
    }

    up(repeat: number = 1): Direction[] {
        return this.repeatMove(Direction.Up, repeat)
    }

    down(repeat: number = 1): Direction[] {
        return this.repeatMove(Direction.Down, repeat)
    }

    wait(sec: number): Promise<unknown> {
        return wait(sec)
    }

    random(repeat: number = 1): Direction[] {
        return new Array(repeat).fill(null).map(() => [
            Direction.Right,
            Direction.Left,
            Direction.Up,
            Direction.Down
        ][random(0, 3)])
    }

    tileRight(repeat: number = 1): CallbackTileMove {
        return this.repeatTileMove('right', repeat, 'tileWidth')
    }

    tileLeft(repeat: number = 1): CallbackTileMove {
        return this.repeatTileMove('left', repeat, 'tileWidth')
    }

    tileUp(repeat: number = 1): CallbackTileMove {
        return this.repeatTileMove('up', repeat, 'tileHeight')
    }

    tileDown(repeat: number = 1): CallbackTileMove {
        return this.repeatTileMove('down', repeat, 'tileHeight')
    }

    tileRandom(repeat: number = 1): CallbackTileMove {
        return (player: RpgPlayer, map): Direction[] => {
            let directions: Direction[] = []
            for (let i = 0; i < repeat; i++) {
                const randFn: CallbackTileMove = [
                    this.tileRight(),
                    this.tileLeft(),
                    this.tileUp(),
                    this.tileDown()
                ][random(0, 3)]
                directions = [
                    ...directions,
                    ...randFn(player, map)
                ]
            }
            return directions
        }
    }

    private _awayFromPlayerDirection(player: RpgPlayer, otherPlayer: RpgPlayer): number {
        const directionOtherPlayer = otherPlayer.getDirection()
        let newDirection = 0
        switch (directionOtherPlayer) {
            case Direction.Left:
            case Direction.Right:
                if (otherPlayer.position.x > player.position.x) {
                    newDirection = Direction.Left
                }
                else {
                    newDirection = Direction.Right
                }
                break
            case Direction.Up:
            case Direction.Down:
                if (otherPlayer.position.y > player.position.y) {
                    newDirection = Direction.Up
                }
                else {
                    newDirection = Direction.Down
                }
                break
        }
        return newDirection
    }

    private _towardPlayerDirection(player: RpgPlayer, otherPlayer: RpgPlayer): number {
        const directionOtherPlayer = otherPlayer.getDirection()
        let newDirection = 0
        switch (directionOtherPlayer) {
            case Direction.Left:
            case Direction.Right:
                if (otherPlayer.position.x > player.position.x) {
                    newDirection = Direction.Right
                }
                else {
                    newDirection = Direction.Left
                }
                break
            case Direction.Up:
            case Direction.Down:
                if (otherPlayer.position.y > player.position.y) {
                    newDirection = Direction.Down
                }
                else {
                    newDirection = Direction.Up
                }
                break
        }
        return newDirection
    }

    private _awayFromPlayer({ isTile, typeMov }: { isTile: boolean, typeMov: string }, otherPlayer: RpgPlayer, repeat: number = 1) {
        const method = (dir: number) => {
            const direction: string = LiteralDirection[dir]
            return this[isTile ? 'tile' + capitalize(direction) : direction](repeat)
        }
        return (player: RpgPlayer, map) => {
            let newDirection = 0
            switch (typeMov) {
                case 'away':
                    newDirection = this._awayFromPlayerDirection(player, otherPlayer)
                    break;
                case 'toward':
                    newDirection = this._towardPlayerDirection(player, otherPlayer)
                    break
            }
            let direction: any = method(newDirection)
            if (isFunction(direction)) {
                direction = direction(player, map)
            }
            return direction
        }
    }

    towardPlayer(player: RpgPlayer, repeat: number = 1) {
        return this._awayFromPlayer({ isTile: false, typeMov: 'toward' }, player, repeat)
    }

    tileTowardPlayer(player: RpgPlayer, repeat: number = 1) {
        return this._awayFromPlayer({ isTile: true, typeMov: 'toward' }, player, repeat)
    }

    awayFromPlayer(player: RpgPlayer, repeat: number = 1): CallbackTileMove {
        return this._awayFromPlayer({ isTile: false, typeMov: 'away' }, player, repeat)
    }

    tileAwayFromPlayer(player: RpgPlayer, repeat: number = 1): CallbackTileMove {
        return this._awayFromPlayer({ isTile: true, typeMov: 'away' }, player, repeat)
    }

    turnLeft(): string {
        return 'turn-' + Direction.Left
    }

    turnRight(): string {
        return 'turn-' + Direction.Right
    }

    turnUp(): string {
        return 'turn-' + Direction.Up
    }

    turnDown(): string {
        return 'turn-' + Direction.Down
    }

    turnRandom(): string {
        return [
            this.turnRight(),
            this.turnLeft(),
            this.turnUp(),
            this.turnDown()
        ][random(0, 3)]
    }

    turnAwayFromPlayer(otherPlayer: RpgPlayer): CallbackTurnMove {
        return (player: RpgPlayer) => {
            const direction = this._awayFromPlayerDirection(player, otherPlayer)
            return 'turn-' + direction
        }
    }

    turnTowardPlayer(otherPlayer: RpgPlayer): CallbackTurnMove {
        return (player: RpgPlayer) => {
            const direction = this._towardPlayerDirection(player, otherPlayer)
            return 'turn-' + direction
        }
    }
}

export const Move = new MoveList()

export class MoveManager {
    private movingSubscription: Subscription
    private _infiniteRoutes: Routes
    private _finishRoute: Function

    /** 
     * Changes the player's speed
     * 
     * ```ts
     * player.speed = 1
     * ```
     * 
     * You can use Speed enum
     * 
     * ```ts
     * import { Speed } from '@rpgjs/server'
     * player.speed = Speed.Slow
     * ```
     * 
     * @title Change Speed
     * @prop {number} player.speed
     * @enum {number}
     * 
     * Speed.Slowest | 0.2
     * Speed.Slower | 0.5
     * Speed.Slow | 1
     * Speed.Normal | 3
     * Speed.Fast | 5
     * Speed.Faster | 7
     * Speed.Fastest | 10
     * @default 3
     * @memberof MoveManager
     * */
    speed: number

    /** 
     * Blocks the movement. The player will not be able to move even if he presses the direction keys on the keyboard.
     * 
     * ```ts
     * player.canMove = false
     * ```
     * 
     * @title Block movement
     * @prop {boolean} player.canMove
     * @default true
     * @memberof MoveManager
     * */
    canMove: boolean

    /** 
    * The player passes through the other players (or vice versa). But the player does not go through the events.
    * 
    * ```ts
    * player.throughOtherPlayer = true
    * ```
    * 
    * @title Go through to other player
    * @prop {boolean} player.throughOtherPlayer
    * @default true
    * @memberof MoveManager
    * */
    throughOtherPlayer: boolean

    /** 
     * The player goes through the event or the other players (or vice versa)
     * 
     * ```ts
     * player.through = true
     * ```
     * 
     * @title Go through the player
     * @prop {boolean} player.through
     * @default false
     * @memberof MoveManager
     * */
    through: boolean

    /** 
     * The frequency allows to put a stop time between each movement in the array of the moveRoutes() method.
     * The value represents a dwell time in milliseconds. The higher the value, the slower the frequency.
     * 
     * ```ts
     * player.frequency = 400
     * ```
     * 
     * You can use Frequency enum
     * 
     * ```ts
     * import { Frequency } from '@rpgjs/server'
     * player.frequency = Frequency.Low
     * ```
     * 
     * @title Change Frequency
     * @prop {number} player.speed
     * @enum {number}
     * 
     * Frequency.Lowest | 600
     * Frequency.Lower | 400
     * Frequency.Low | 200
     * Frequency.High | 100
     * Frequency.Higher | 50
     * Frequency.Highest | 25
     * Frequency.None | 0
     * @default 0
     * @memberof MoveManager
     * */
    frequency: number

    /**
     * Gives an itinerary. 
     * 
     * You can create your own motion function:
     * 
     * ```ts
     * import { Direction } from '@rpgjs/server'
     * 
     * const customMove = () => {
     *      return [Direction.Left, Direction.Up]
     * }
     * 
     * player.moveRoutes([ customMove() ])
     * ```
     * 
     * Your function can also return a function:
     * 
     *  ```ts
     * import { Direction, RpgPlayer } from '@rpgjs/server'
     * 
     * // This function can be found in another file. By returning a function, you have access to the player who is making a move.
     * const customMove = (otherPlayer: RpgPlayer) => {
     *      return (player: RpgPlayer, map) => {
     *          return otherPlayer.position.x > player.position.x ? Direction.Left : Direction.Right
     *      }
     * }
     * 
     * player.moveRoutes([ customMove(otherPlayer) ])
     * ```
     * 
     * the function contains two parameters:
     * 
     * - `player`: the player concerned by the movement
     * - `map`: The information of the current map
     * 
     * @title Give an itinerary
     * @method player.moveRoutes(routes)
     * @param {Array<Move>} routes
     * @returns {Promise}
     * @memberof MoveManager
     * @example 
     * 
     * ```ts
     * import { Move } from '@rpgjs/server'
     * 
     * await player.moveRoutes([ Move.tileLeft(), Move.tileDown(2) ])
     * // The path is over when the promise is resolved
     * ```
     */
    moveRoutes(routes: Routes): Promise<boolean> {
        let count = 0
        let frequence = 0
        this.breakRoutes() // break previous route
        return new Promise(async (resolve) => {
            this._finishRoute = resolve
            routes = routes.map((route: any) => {
                if (isFunction(route)) {
                    const map = this.getCurrentMap()
                    if (!map) {
                        return undefined
                    }
                    return route.apply(route, [this, map])
                }
                return route
            })
            routes = arrayFlat(routes)
            const move = (): Observable<any> => {
                // If movement continues while the player no longer exists or is no longer on the map
                if (!this) {
                    return of(null)
                }
                // if map not exists
                if (!this.getCurrentMap()) {
                    return of(null)
                }
                if (count >= this['nbPixelInTile']) {
                    if (frequence < this.frequency) {
                        frequence++
                        return of(null)
                    }
                }

                frequence = 0
                count++

                const [route] = routes

                if (route === undefined) {
                    this.breakRoutes()
                    return of(null)
                }

                let ob$ = new Observable()

                switch (route) {
                    case Direction.Left:
                    case Direction.Down:
                    case Direction.Right:
                    case Direction.Up:
                        ob$ = from(this.moveByDirection(route, 1))
                        break
                    case 'turn-' + Direction.Left:
                        ob$ = of(this.changeDirection(Direction.Left))
                        break
                    case 'turn-' + Direction.Right:
                        ob$ = of(this.changeDirection(Direction.Right))
                        break
                    case 'turn-' + Direction.Up:
                        ob$ = of(this.changeDirection(Direction.Up))
                        break
                    case 'turn-' + Direction.Down:
                        ob$ = of(this.changeDirection(Direction.Down))
                        break
                }

                return ob$.pipe(
                    tap(() => {
                        routes.shift()
                    })
                )
            }
            this.movingSubscription = this.server.tick
                .pipe(
                    takeUntil(
                        this._destroy$.pipe(
                            tap(() => {
                                this.breakRoutes(true)
                            })
                        )),
                    switchMap(move)
                )
                .subscribe()
        })
    }

    /**
     * Giving a path that repeats itself in a loop to a character
     * 
     * You can stop the movement at any time with `breakRoutes()` and replay it with `replayRoutes()`.
     * 
     * @title Infinite Move Routes
     * @method player.infiniteMoveRoute(routes)
     * @param {Array<Move>} routes
     * @returns {void}
     * @memberof MoveManager
     * @example 
     * 
     * ```ts
     * import { Move } from '@rpgjs/server'
     * 
     * player.infiniteMoveRoute([ Move.tileRandom() ])
     * ```
     */
    infiniteMoveRoute(routes: Routes): void {
        this._infiniteRoutes = routes

        const move = (isBreaking: boolean) => {
            if (isBreaking) return
            this.moveRoutes(routes).then(move)
        }

        move(false)
    }

    /**
     * Works only for infinite movements. You must first use the method `infiniteMoveRoute()`
     * 
     * @title Stop an infinite movement
     * @method player.breakRoutes(force=false)
     * @param {boolean} [force] Forces the stop of the infinite movement
     * @returns {void}
     * @memberof MoveManager
     * @example 
     * 
     * ```ts
     * import { Move } from '@rpgjs/server'
     * 
     * player.infiniteMoveRoute([ Move.tileRandom() ])
     * player.breakRoutes(true)
     * ```
     */
    breakRoutes(force: boolean = false): void {
        if (this._finishRoute) {
            this.movingSubscription?.unsubscribe()
            this._finishRoute(force)
        }
    }

    /**
     * Works only for infinite movements. You must first use the method `infiniteMoveRoute()`
     * If the road was stopped with `breakRoutes()`, you can restart it with this method
     * 
     * @title Replay an infinite movement
     * @method player.replayRoutes()
     * @returns {void}
     * @memberof MoveManager
     * @example 
     * 
     * ```ts
     * import { Move } from '@rpgjs/server'
     * 
     * player.infiniteMoveRoute([ Move.tileRandom() ])
     * player.breakRoutes(true)
     * player.replayRoutes()
     * ```
     */
    replayRoutes(): void {
        if (this._infiniteRoutes) this.infiniteMoveRoute(this._infiniteRoutes)
    }

    /**
     * Move the event to another event, a player, a shape or a specific position.
     * The event will avoid obstacles, but you can tell if it is stuck or has completed its path
     * 
     * @title Move To
     * @method player.moveTo()
     * @param {RpgPlayer|RpgEvent|RpgShape|Position} target the target
     * @param {object} [options] - animate. Set a boolean to use default parameters
     * @param {boolean} [options.infinite=false] - moves infinitely towards the target, you have to stop its movement manually with the method `stopMoveTo()`
     * @param {() => void} [options.onComplete] - Callback when the event arrives at the destination
     * @param {(duration:number) => void} [options.onStuck] - callback when the event is blocked against a wall. Duration gives you the duration (in frames) of the blocking time
     * @returns {Observable<void>}
     * @since 3.2.0
     * @memberof MoveManager
     * @example 
     * 
     * ```ts
     * import { Move } from '@rpgjs/server'
     * 
     * player.moveTo(otherPlayer).subscribe()
     * ```
     */
    moveTo(event: RpgEvent, options?: MoveTo): Observable<void>
    moveTo(player: RpgPlayer, options?: MoveTo): Observable<void>
    moveTo(position: PositionXY, options?: MoveTo): Observable<void>
    moveTo(shape: RpgShape, options?: MoveTo): Observable<void>
    moveTo(position: RpgPlayer | RpgShape | PositionXY, options?: MoveTo): Observable<void> {
        return this['_moveTo'](this.server.tick, position, options)
    }

    // TODO
    setMoveMode(mode: MoveMode): void {
        if (mode.checkCollision) this.checkCollision = mode.checkCollision
        if (mode.clientMode) this.clientModeMove = mode.clientMode
        if (mode.behavior) this.behavior = mode.behavior
        this.emit(SocketEvents.CallMethod, {
            objectId: this.id,
            name: SocketMethods.ModeMove,
            params: [mode]
        })
    }
}

export interface MoveManager {
    moveByDirection: (direction: Direction, deltaTimeInt: number) => Promise<boolean>
    changeDirection: (direction: Direction) => boolean
    getCurrentMap: any
    checkCollision: boolean
    clientModeMove: ClientMode
    behavior: Behavior
    emit(name: SocketEvents, params: any)
    id: string
    server: RpgServerEngine
    position: Vector2d
    _destroy$: Subject<void>
}