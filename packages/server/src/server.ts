import { ServerEngine } from 'lance-gg';
import { SceneMap } from './Scenes/Map';
import { SceneBattle } from './Scenes/Battle';
import { RpgPlayer } from './Player/Player'
import { Query } from './Query'
import Monitor from './Monitor'
import { DAMAGE_SKILL, DAMAGE_PHYSIC, DAMAGE_CRITICAL, COEFFICIENT_ELEMENTS } from './presets'

export default class RpgServerEngine extends ServerEngine {

    public database: any = {}
    public damageFormulas: any = {}
    private playerClass: RpgPlayer
    private scenes: Map<string, any> = new Map()
    protected totalConnected: number = 0

    constructor(public io, public gameEngine, private inputOptions) {
        super(io, gameEngine, inputOptions)
        this.playerClass = inputOptions.playerClass || RpgPlayer
        if (inputOptions.database) {
            for (let key in inputOptions.database) {
                const data = inputOptions.database[key]
                this.database[data.id] = data
            }
        }
        this.damageFormulas = inputOptions.damageFormulas || {}
        this.damageFormulas = {
            damageSkill: DAMAGE_SKILL,
            damagePhysic: DAMAGE_PHYSIC,
            damageCritical: DAMAGE_CRITICAL,
            coefficientElements: COEFFICIENT_ELEMENTS,
            ...this.damageFormulas
        }
        this.loadScenes()
    }

    start() {
        super.start() 
        Query.worlds = this.gameEngine.world
    }

    step() {
        super.step()
        //Monitor.update(this.serverTime)
    }

    loadScenes() {
        this.scenes[SceneMap.id] =  new SceneMap(this.inputOptions.maps, this)
        this.scenes[SceneBattle.id] =  new SceneBattle(this)
    }

    getScene(name) {
        return this.scenes[name]
    }

    sendToPlayer(currentPlayer, eventName, data) {
        currentPlayer.socket.emit(eventName, data)
    }   

    onPlayerConnected(socket) {
        super.onPlayerConnected(socket)
        const player = this.gameEngine.addPlayer(this.playerClass, socket.playerId, true)
        player.socket = socket
        Monitor.addMonitor(socket)
        player.server = this
        player._init()
        player.execMethod('onConnected') 
    }

    onPlayerDisconnected(socketId, playerId) {
        super.onPlayerDisconnected(socketId, playerId);
        const object = this.gameEngine.world.getObject(playerId)
        Monitor.removeMonitor(socketId)
        this.gameEngine.removeObjectFromWorld(object.id)
    }
}