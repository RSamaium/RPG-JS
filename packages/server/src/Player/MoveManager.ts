import { Direction } from '@rpgjs/common'
import { Utils } from '@rpgjs/common'
import { RpgPlayer } from './Player';

const {
    arrayFlat,
    random,
    isFunction
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
}

export class MoveManager {
    
    private movingInterval
    
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
    getCurrentMap: any
}