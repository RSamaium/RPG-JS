import { GameEngine, CannonPhysicsEngine, Utils } from 'lance-gg'
import { RpgCommonPlayer, Direction } from './Player'
import { Control } from './Input'
import Event from './Event'
import SAT from 'sat'

const PLAYER_CLASS = Utils.hashStr('Player')
const EVENT_CLASS = Utils.hashStr('Event')

export default class Game extends GameEngine<any> {

    physicsEngine: any
    events: any

    constructor(options) {
        super(options);
        /*this.physicsEngine = new SimplePhysicsEngine({ 
            gameEngine: this,
            collisions: { type: 'bruteForce', autoResolve: false }
        });*/
        this.physicsEngine = new CannonPhysicsEngine({ gameEngine: this }) 
        this.events = {} // events for all player in map
    }

    registerClasses(serializer) {
        serializer.registerClass(RpgCommonPlayer, PLAYER_CLASS)
        serializer.registerClass(Event, EVENT_CLASS)
        serializer.registerClass(SAT.Box)
    }

    addObject(_class, playerId?) {
        let event
        if (!playerId) playerId = '$$' + Utils.generateUID()
        if (_class.constructor.name == 'Function') {
            event = new _class(this, { id: playerId }, { playerId })
        }
        else {
            event = _class
        }
        return event
    }

    addPlayer(playerClass, playerId, addWord = true) {
        const player = this.addObject(playerClass, playerId)
        player.classId =  PLAYER_CLASS
        if (addWord) this.addObjectToWorld(player) 
        return player
    }

    addEvent(eventClass, addWord = true) {
        const event = this.addObject(eventClass)
        event.classId =  EVENT_CLASS
        if (addWord) this.addObjectToWorld(event) 
        return event
    }

    processInput(inputData, playerId) {
        super.processInput(inputData, playerId)

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
            player.move(input)
        }
        //if (player.execMethod) player.execMethod('onInput', [inputData])
        if (player.onInput) player.onInput(inputData) 
    }
}
