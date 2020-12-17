import { Direction } from '@rpgjs/common'
import { Utils } from '@rpgjs/common'
import { RpgPlayer } from './Player';
import { EventMode } from '../Event';
import { World } from '@rpgjs/sync-server';

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
type Routes = (string | Promise<any> | Direction | Function)[]

export enum Frequency {
    Low = 400,
    None = 0
}

export enum Speed {
    Slow = 1,
    Normal = 3,
    Fast = 5
}

export const Move = new class {

    repeatMove(direction: Direction, repeat: number): Direction[] {
        return new Array(repeat).fill(direction)
    }

    repeatTileMove(direction: Direction, repeat: number, propMap: string): CallbackTileMove {
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
        return this.repeatTileMove(Direction.Right, repeat, 'tileWidth')
    }

    tileLeft(repeat: number = 1): CallbackTileMove {
        return this.repeatTileMove(Direction.Left, repeat, 'tileWidth')
    }

    tileUp(repeat: number = 1): CallbackTileMove {
        return this.repeatTileMove(Direction.Up, repeat, 'tileHeight')
    }

    tileDown(repeat: number = 1): CallbackTileMove {
        return this.repeatTileMove(Direction.Down, repeat, 'tileHeight')
    }

    tileRandom(repeat: number = 1): CallbackTileMove {
        return (player: RpgPlayer, map): Direction[] => {
            let directions: Direction[] = []
            for (let i=0 ; i < repeat ; i++) {
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

    _awayFromPlayerDirection(player: RpgPlayer, otherPlayer: RpgPlayer): string {
        const directionOtherPlayer = otherPlayer.getDirection()
        let newDirection = ''
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

    _towardPlayerDirection(player: RpgPlayer, otherPlayer: RpgPlayer): string {
        const directionOtherPlayer = otherPlayer.getDirection()
        let newDirection = ''
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

    _awayFromPlayer({ isTile, typeMov }: { isTile: boolean, typeMov: string}, otherPlayer: RpgPlayer, repeat: number = 1) {
        const method = dir => this[isTile ? 'tile' + capitalize(dir) : dir](repeat)
        return (player: RpgPlayer, map) => {
            let newDirection = ''
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
        return 'turn-left'
    }

    turnRight(): string {
        return 'turn-right'
    }

    turnUp(): string {
        return 'turn-up'
    }

    turnDown(): string {
        return 'turn-down'
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

export class MoveManager {
    
    private movingInterval
    private _infiniteRoutes: Routes
    private _finishRoute: Function

    speed: number
    canMove: boolean
    through: boolean
    frequency: number
    
    /**
     * Gives an itinerary
     * @title Give an itinerary
     * @method player.moveRoutes(routes)
     * @param {Array<string | Promise<any> | Direction | Function>} routes
     * @returns {Promise}
     * @memberof MoveManager
     * @example 
     * 
     * ```ts
     * import { Move } from '@rpgjs/server'
     * 
     * player.moveRoutes([ Move.tileLeft(), Move.tileDown(2) ])
     * ```
     */
    moveRoutes(routes: Routes) : Promise<boolean> {
        let count = 0
        let frequence = this.frequency
        return new Promise((resolve) => {
            this._finishRoute = resolve
            routes = routes.map((route: any) => {
                if (isFunction(route)) {
                    return route(this, this.getCurrentMap())
                }
                return route
            })
            routes = arrayFlat(routes)
            const move = () => {
                if (count % this['nbPixelInTile'] == 0) {
                    if (frequence < this.frequency) {
                        frequence++
                        return
                    }
                }

                frequence = 0
                count++

                const [route] = routes

                if (!route) {
                    this.breakRoutes()
                    return
                }
                
                switch (route) {
                    case Direction.Left:
                    case Direction.Down:
                    case Direction.Right:
                    case Direction.Up:
                        this.move(route)
                        break
                    case 'turn-left':
                        this.changeDirection(Direction.Left)
                        break
                    case 'turn-right':
                        this.changeDirection(Direction.Right)
                        break
                    case 'turn-up':
                         this.changeDirection(Direction.Up)
                        break
                    case 'turn-down':
                        this.changeDirection(Direction.Down)
                        break
                }
                routes.shift()

                // If the event is in Scenario mode, you don't use the launcher-gg library for the positions but @rpgjs/sync-server
                if (this.constructor['mode'] == EventMode.Scenario) {
                    const room = World.getRoom(this['map'])
                    if (room.$detectChanges) room.$detectChanges()
                }
            }
            move()
            this.movingInterval = setInterval(move, 16)
        })
    }

    infiniteMoveRoute(routes: Routes): void {
        this._infiniteRoutes = routes

        const move = (isBreaking: boolean) => {
            if (isBreaking) return
            this.moveRoutes(routes).then(move)
        }

        move(false)
    }

    breakRoutes(force: boolean = false): void {
        if (this._finishRoute) {
            clearInterval(this.movingInterval)
            this._finishRoute(force)
        }
    }

    replayRoutes(): void {
        if (this._infiniteRoutes) this.infiniteMoveRoute(this._infiniteRoutes)
    }
}

export interface MoveManager{ 
    move: (direction: Direction) => boolean
    changeDirection: (direction: Direction) => boolean
    getCurrentMap: any
}