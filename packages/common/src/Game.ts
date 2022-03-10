import { generateUID } from './Utils'
import { EventEmitter } from './EventEmitter'
import { RpgCommonPlayer, Direction } from './Player'
import { Control } from './Input'
import { RpgPlugin } from './Plugin'
import { GameWorker } from './Worker'

export default class Game extends EventEmitter {

    events: any
    world: any

    constructor(private side: string) {
        super()
        this.events = {} // events for all player in map
    }

    start(world) {
        this.world = world
    }

    createWorkers(workerClass: any) {
        return new GameWorker(workerClass)
    }
    
    addObject(_class, playerId?) {
        let event
        if (!playerId) playerId = generateUID()
        if (_class.constructor.name == 'Function') {
            event = new _class(this, playerId)
        }
        else {
            event = _class
        }
        return event
    }

    addPlayer(playerClass, playerId) {
        const player = this.addObject(playerClass, playerId)
        return player
    }

    addEvent(eventClass) {
        const event = this.addObject(eventClass)
        return event
    }

    processInput(inputData: { input: Control | Direction, deltaTimeInt?: number }, playerId: string) {
        const player: RpgCommonPlayer = this.world.getObject(playerId)
        const { input, deltaTimeInt } = inputData 
        let moving = false

        if (!player) return
        if (!player.canMove) return

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
            player.moveByDirection(input, deltaTimeInt || 1) 
        } 
        if (this.side == 'server') RpgPlugin.emit('Server.onInput', [player, {
            ...inputData,
            moving
        }], true)
    }
}
