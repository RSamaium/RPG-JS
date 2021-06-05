import { SceneMap } from './Scenes/Map';
import { SceneBattle } from './Scenes/Battle';
import { RpgPlayer } from './Player/Player'
import { Query } from './Query'
import { DAMAGE_SKILL, DAMAGE_PHYSIC, DAMAGE_CRITICAL, COEFFICIENT_ELEMENTS } from './presets'
import { World } from '@rpgjs/sync-server'
import { Utils, RpgPlugin, Scheduler, HookServer, HookClient} from '@rpgjs/common'

let tick = 0

export class RpgServerEngine {

    app
    public database: any = {}
    public damageFormulas: any = {}
    private playerClass: any
    private scenes: Map<string, any> = new Map()
    protected totalConnected: number = 0
    private scheduler: Scheduler

    constructor(public io, public gameEngine, private inputOptions) { 
        this.playerClass = inputOptions.playerClass || RpgPlayer
        this.damageFormulas = inputOptions.damageFormulas || {}
        this.damageFormulas = {
            damageSkill: DAMAGE_SKILL,
            damagePhysic: DAMAGE_PHYSIC,
            damageCritical: DAMAGE_CRITICAL,
            coefficientElements: COEFFICIENT_ELEMENTS,
            ...this.damageFormulas
        }

        if (!this.inputOptions.maps) this.inputOptions.maps = []
        this.inputOptions.maps = [
            ...Utils.arrayFlat(RpgPlugin.emit(HookServer.AddMap, this.inputOptions.maps)) || [],
            ...this.inputOptions.maps
        ]

        if (!inputOptions.database) inputOptions.database = {}
       
        const datas = RpgPlugin.emit(HookServer.AddDatabase, this.inputOptions.database) || []
        
        for (let plug of datas) {
            this.inputOptions.database = {
                ...plug,
                ...this.inputOptions.database
            }
        }

        for (let key in inputOptions.database) {
            const data = inputOptions.database[key]
            this.database[data.id] = data
        }

        this.loadScenes()
    }

     /**
     * Start the RPG server
     * 
     * @method server.start()
     * @returns {void}
     * @memberof RpgServerEngine
     */
    start() {
        let schedulerConfig = {
            tick: this.step.bind(this),
            period: 1000 / this.inputOptions.stepRate,
            delay: 4
        };
        this.scheduler = new Scheduler(schedulerConfig).start();
        this.gameEngine.start({
            getObject(id) {
                return Query.getPlayer(id) 
            },
            getObjectsOfGroup(groupId: string, player: RpgPlayer) {
                return Query.getObjectsOfMap(groupId, player)
            }
        })
        this.io.on('connection', this.onPlayerConnected.bind(this))
        RpgPlugin.emit(HookServer.Start)
    }

    step() {
        tick++
        if (tick % 4 === 0) {
            World.send()
        }
    }

    loadScenes() {
        this.scenes[SceneMap.id] =  new SceneMap(this.inputOptions.maps, this)
        this.scenes[SceneBattle.id] =  new SceneBattle(this)
    }

    getScene(name) {
        return this.scenes[name]
    }

    sendToPlayer(currentPlayer, eventName, data) {
        currentPlayer._socket.emit(eventName, data)
    }

    onPlayerConnected(socket) {
        const playerId = Utils.generateUID()
        let player: RpgPlayer = new this.playerClass(this.gameEngine, playerId)

        socket.on('move', (data) => {
            this.gameEngine.processInput(data, playerId)
        })

        socket.on('disconnect', () => {
            this.onPlayerDisconnected(socket.id, playerId)
        })
        
        World.setUser(player, socket) 

        socket.emit('playerJoined', { playerId })

        player.server = this
        player._init()
        player.execMethod('onConnected')
    }

    onPlayerDisconnected(socketId, playerId: string) { 
        const player: RpgPlayer = World.getUser(playerId) as RpgPlayer
        player.execMethod('onDisconnected')
        World.disconnectUser(playerId)
    }
}