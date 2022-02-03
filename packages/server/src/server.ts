import { SceneMap } from './Scenes/Map';
import { RpgPlayer } from './Player/Player'
import { Query } from './Query'
import { DAMAGE_SKILL, DAMAGE_PHYSIC, DAMAGE_CRITICAL, COEFFICIENT_ELEMENTS } from './presets'
import { World, WorldClass } from '@rpgjs/sync-server'
import { Utils, RpgPlugin, Scheduler, HookServer } from '@rpgjs/common'

let tick = 0

export class RpgServerEngine {

     /**
     * Express App Instance. If you have assigned this variable before starting the game, you can get the instance of Express
     * 
     * @prop {Express App} [app]
     * @memberof RpgServerEngine
     */
    app

    /**
     * List of the data
     * 
     * @prop {object} [database]
     * @memberof RpgServerEngine
     */
    public database: any = {}

    /** 
     * retrieve the global configurations assigned at the entry point
     * 
     * @prop {object} [globalConfig]
     * @readonly
     * @memberof RpgServerEngine
     * */
    public globalConfig: any = {}

    /**
     * Combat formulas
     * 
     * @prop {object} [damageFormulas]
     * @memberof RpgServerEngine
     */
    public damageFormulas: any = {}

    private playerClass: any
    private scenes: Map<string, any> = new Map()
    protected totalConnected: number = 0
    private scheduler: Scheduler
    world: WorldClass = World

    /**
     * Combat formulas
     * 
     * @prop {Socket Io Server} [io]
     * @memberof RpgServerEngine
     */
    constructor(public io, public gameEngine, public inputOptions) {}

    private async _init() {
        this.playerClass = this.inputOptions.playerClass || RpgPlayer
        this.damageFormulas = this.inputOptions.damageFormulas || {}
        this.damageFormulas = {
            damageSkill: DAMAGE_SKILL,
            damagePhysic: DAMAGE_PHYSIC,
            damageCritical: DAMAGE_CRITICAL,
            coefficientElements: COEFFICIENT_ELEMENTS,
            ...this.damageFormulas
        }

        this.globalConfig = this.inputOptions.globalConfig

        if (!this.inputOptions.maps) this.inputOptions.maps = []

        this.inputOptions.maps = [
            ...Utils.arrayFlat(await RpgPlugin.emit(HookServer.AddMap, this.inputOptions.maps)) || [],
            ...this.inputOptions.maps
        ]

        if (!this.inputOptions.database) this.inputOptions.database = {}
       
        const datas = await RpgPlugin.emit(HookServer.AddDatabase, this.inputOptions.database) || []
        
        for (let plug of datas) {
            this.inputOptions.database = {
                ...plug,
                ...this.inputOptions.database
            }
        }

        for (let key in this.inputOptions.database) {
            const data = this.inputOptions.database[key]
            this.addInDatabase(data.id, data)
        }

        this.loadScenes()
    }

    /**
     * Adds data to the server's database (in RAM) for later use
     * 
     * @method server.addInDatabase(id,data)
     * @title Add in database
     * @param {number} id resource id
     * @param {class} dataClass A class representing the data
     * @since 3.0.0-beta.4
     * @example
     * ```ts
     * @Item({
     *      name: 'Potion',
     *      description: 'Gives 100 HP',
     * })
     * class MyItem() {}
     * 
     * server.addInDatabase('dynamic_item', MyItem)
     * ```
     * @returns {void}
     * @memberof RpgServerEngine
     */
    addInDatabase(id: string, dataClass: any) {
        this.database[id] = dataClass
    }

     /**
     * Start the RPG server
     * 
     * @method server.start()
     * @title Start Server
     * @returns {void}
     * @memberof RpgServerEngine
     */
    async start(inputOptions?, scheduler = true) {
        if (inputOptions) this.inputOptions = inputOptions
        await this._init()
        let schedulerConfig = {
            tick: this.step.bind(this),
            period: 1000 / this.inputOptions.stepRate,
            delay: 4
        };
        this.scheduler = new Scheduler(schedulerConfig)
        if (scheduler) this.scheduler.start()
        this.gameEngine.start({
            getObject(id) {
                return Query.getPlayer(id) 
            },
            getObjectsOfGroup(groupId: string, player: RpgPlayer) {
                return Query.getObjectsOfMap(groupId, player)
            }
        })
        this.io.on('connection', this.onPlayerConnected.bind(this))
        RpgPlugin.emit(HookServer.Start, this)
    }

    /**
     * Sends all packages to clients. The sending is done automatically but you can decide to send yourself by calling this method (for example, for unit tests)
     * 
     * @method server.send()
     * @title Send All Packets
     * @returns {void}
     * @memberof RpgServerEngine
     */
    send() {
        this.world.send()
    }

    step() {
        tick++
        if (tick % 4 === 0) {
            this.send() 
        }
        RpgPlugin.emit(HookServer.Step, this)
    }

    private loadScenes() {
        this.scenes.set(SceneMap.id, new SceneMap(this.inputOptions.maps, this))
    }

    getScene(name: string) {
        return this.scenes.get(name)
    }

    /**
     * Return the scene that manages the maps of the game
     * @prop {SceneMap} [sceneMap]
     * @since 3.0.0-beta.4
     * @memberof RpgServerEngine
     */
    get sceneMap() {
        return this.getScene(SceneMap.id)
    }

    sendToPlayer(currentPlayer, eventName, data) {
        currentPlayer._socket.emit(eventName, data)
    }

    private onPlayerConnected(socket) {
        const playerId = Utils.generateUID()
        let player: RpgPlayer = new this.playerClass(this.gameEngine, playerId)

        socket.on('move', (data) => {
            this.gameEngine.processInput(data, playerId)
        })

        socket.on('disconnect', () => {
            this.onPlayerDisconnected(socket.id, playerId)
        })
        
        this.world.setUser(player, socket)

        socket.emit('playerJoined', { playerId })

        player.server = this
        player._init()
        player.execMethod('onConnected')
    }

    /**
     * 
     * @param {string} socketId - The socketId of the player that disconnected
     * @param {string} playerId - The playerId of the player that disconnected 
     */
    private onPlayerDisconnected(socketId, playerId: string) { 
        const player: RpgPlayer = World.getUser(playerId) as RpgPlayer
        player.execMethod('onDisconnected')
        this.world.disconnectUser(playerId)
    }
}