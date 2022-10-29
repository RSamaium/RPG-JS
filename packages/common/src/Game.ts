import { generateUID, isClass } from './Utils'
import { EventEmitter } from './EventEmitter'
import { RpgCommonPlayer, Direction } from './Player'
import { Control } from './Input'
import { RpgPlugin } from './Plugin'
import { GameWorker } from './Worker'
import { HitObject } from './Hit'
import { RpgShape } from './Shape'
import { TiledObjectClass } from '@rpgjs/tiled'

export enum GameSide {
    Server = 'server',
    Client = 'client',
    Worker = 'worker'
}

export class RpgCommonGame extends EventEmitter {

    events: any
    world: any
    
    constructor(public side: GameSide) {
        super()
        this.events = {} // events for all player in map
    }

    get isWorker() {
        return this.side == 'worker'
    }

    start(world) {
        this.world = world
    }

    createWorkers(options: any) {
        return new GameWorker(options)
    }
    
    addObject(_class, playerId?: string) {
        let event
        if (!playerId) playerId = generateUID()
        if (isClass(_class)) {
            event = new _class(this, playerId)
        }
        else {
            event = _class
        }
        return event
    }

    addPlayer(playerClass, playerId?: string) {
        const player = this.addObject(playerClass, playerId)
        return player
    }

    addEvent(eventClass, eventId?: string) {
        const event = this.addObject(eventClass, eventId)
        return event
    }

    addShape(obj: HitObject): RpgShape {
        const id = obj.name = (obj.name || generateUID()) as string
        const shape = new RpgShape(obj as TiledObjectClass)
        shape.name = id
        return shape
    }

    async processInput<RpgPlayer extends RpgCommonPlayer>(playerId: string): Promise<RpgPlayer> {
        const player: RpgPlayer = this.world.getObject(playerId)

        if (!player) return player
        
        const routesMove: any = []

        while (player.pendingMove.length > 0) {
            const inputData = player.pendingMove.shift()
            let { input, deltaTimeInt } = inputData as any
            let moving = false
            if (input == Control.Action) {
                player.triggerCollisionWith(RpgCommonPlayer.ACTIONS.ACTION)
            }
            else if (
                input == Direction.Left || 
                input == Direction.Right || 
                input == Direction.Up || 
                input == Direction.Down
            ) {
                moving = true
                const isMove = await player.moveByDirection(+input, deltaTimeInt || 1)
                if (isMove) {
                    routesMove.push(inputData)
                }
            } 
            // TODO, is Worker
            RpgPlugin.emit('Server.onInput', [player, {
                ...inputData,
                moving
            }], true)

        }
        return player
    }
}
