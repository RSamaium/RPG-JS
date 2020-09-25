import { GameEngine, SimplePhysicsEngine, Utils } from 'lance-gg'
import Player from './Player'

const PLAYER_CLASS = Utils.hashStr('Player')

export default class Game extends GameEngine<any> {

    physicsEngine: any
    events: any

    constructor(options) {
        super(options);
        this.physicsEngine = new SimplePhysicsEngine({ 
            gameEngine: this,
            collisions: { type: 'bruteForce', autoResolve: false }
        });
        this.events = {} // events for all player in map
    }

    registerClasses(serializer) {
        serializer.registerClass(Player, PLAYER_CLASS)
    }

    addPlayer(playerClass, playerId, addWord = true) {
        const player = new playerClass(this, { id: playerId }, { playerId })
        player.classid = PLAYER_CLASS
        if (addWord) this.addObjectToWorld(player)
        return player
    }

    addEvent(eventClass, addWord = true) {
        const playerId = ''+Math.random()
        const event = new eventClass(this, { id: playerId }, { playerId })
        event.classId =  PLAYER_CLASS
        if (addWord) this.addObjectToWorld(event)
        return event
    }

    processInput(inputData, playerId) {
        super.processInput(inputData, playerId)

        const player = this.world.getObject(playerId)

        if (!player) return
        if (!player.canMove) return

        player.changeDirection(inputData.input)

        if (inputData.input === 'space') {
            player.triggerCollisionWith(Player.ACTIONS.ACTION)
        }
        else {
            player.move(inputData.input)
        }

        if (player.onInput) {
            player.onInput(inputData)
            player.syncChanges()
        }

    }
}
