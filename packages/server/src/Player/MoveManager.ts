import { Direction } from '@rpgjs/common'
import { Utils } from '@rpgjs/common'
import { RpgPlayer } from './Player';

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

    _awayFromPlayer(isTile: boolean, otherPlayer: RpgPlayer, repeat: number = 1) {
        const method = dir => this[isTile ? 'tile' + capitalize(dir) : dir](repeat)
        return (player: RpgPlayer, map) => {
            const newDirection = this._awayFromPlayerDirection(player, otherPlayer)
            let direction: any = method(newDirection)
            if (isFunction(direction)) {
                direction = direction(player, map)
            }
            return direction
        }
    }

    awayFromPlayer(player: RpgPlayer, repeat: number = 1): CallbackTileMove {
        return this._awayFromPlayer(false, player, repeat)
    }

    tileAwayFromPlayer(player: RpgPlayer, repeat: number = 1): CallbackTileMove {
        return this._awayFromPlayer(true, player, repeat)
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

    turnTowardPlayer(otherPlayer: RpgPlayer) {
        return (player: RpgPlayer) => {
            const direction = this._awayFromPlayerDirection(player, otherPlayer)
            return 'turn-' + direction
        }
    }
}

export class MoveManager {
    
    private movingInterval

    speed: number
    canMove: boolean
    through: boolean
    frequence: number
    
    /**
     * Gives an itinerary
     * @param routes 
     * @example 
     * ```ts
     * player.moveRoutes([Move.Left, Move.turnLeft, Move.wait(5)])
     * ```
     */
    moveRoutes(routes: (string | Promise<any> | Direction | Function)[]): Promise<undefined> {
        return new Promise((resolve) => {
            routes = routes.map((route: any) => {
                if (isFunction(route)) {
                    return route(this, this.getCurrentMap())
                }
                return route
            })
            routes = arrayFlat(routes)
            const move = () => {
                const [route] = routes

                if (!route) {
                    this.breakRoutes()
                    resolve()
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
            }
            move()
            this.movingInterval = setInterval(move, 16)
        })
    }
    breakRoutes() {
        if (this.movingInterval) clearInterval(this.movingInterval)
    }
}

export interface MoveManager{ 
    move: (direction: Direction) => boolean
    changeDirection: (direction: Direction) => boolean
    getCurrentMap: any
}