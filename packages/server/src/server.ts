import { ServerEngine } from 'lance-gg';
import { SceneMap } from './Scenes/Map';
import { SceneBattle } from './Scenes/Battle';
import PlayerObject from './Player'
import { Query } from './Query'

export default class RpgServerEngine extends ServerEngine {

    private playerClass: PlayerObject
    private scenes: Map<string, any> = new Map()
    protected totalConnected: number = 0
    
    constructor(public io, public gameEngine, private inputOptions) {
        super(io, gameEngine, inputOptions)
        this.playerClass = inputOptions.playerClass || PlayerObject
        this.loadScenes()
    }

    start() {
        super.start() 
        Query.worlds = this.gameEngine.world
    }

    loadScenes() {
        this.scenes[SceneMap.id] =  new SceneMap(this.inputOptions.maps, this)
        this.scenes[SceneBattle.id] =  new SceneBattle(this)
    }

    getScene(name) {
        return this.scenes[name]
    }

    sendToPlayer(currentPlayer, eventName, data) {
        currentPlayer.socket.emit(eventName, data);
    }   

    onPlayerConnected(socket) {
        super.onPlayerConnected(socket)
        const player = this.gameEngine.addPlayer(this.playerClass, socket.playerId, true)
        player.socket = socket
        player.server = this
        player._init()
        this.totalConnected++
        if (this['onStatus']) this['onStatus'](this.totalConnected)
        player.execMethod('onConnected')
    }

    onPlayerDisconnected(socketId, playerId) {
        super.onPlayerDisconnected(socketId, playerId);
        const object = this.gameEngine.world.getObject(playerId)
        this.totalConnected--
        if (this['onStatus']) this['onStatus'](this.totalConnected)
        this.gameEngine.removeObjectFromWorld(object.id)
    }
}