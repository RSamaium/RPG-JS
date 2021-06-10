import { generateUID } from './Utils'
import { EventEmitter } from './EventEmitter'
import { RpgCommonPlayer, Direction } from './Player'
import { Control } from './Input'
import { RpgPlugin } from './Plugin'

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

    addPlayer(playerClass, playerId, addWord = true) {
        const player = this.addObject(playerClass, playerId)
        return player
    }

    addEvent(eventClass, addWord = true) {
        const event = this.addObject(eventClass)
        return event
    }

    processInput(inputData, playerId) {
        const player = this.world.getObject(playerId)
        const { input } = inputData 

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
            player.moveByDirection(input)
        }
        if (this.side == 'server') RpgPlugin.emit('Server.onInput', [player, inputData], true)
    }
}
