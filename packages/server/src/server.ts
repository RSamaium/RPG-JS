import { SceneMap } from './Scenes/Map';
import { RpgPlayer } from './Player/Player'
import { Query } from './Query'
import { DAMAGE_SKILL, DAMAGE_PHYSIC, DAMAGE_CRITICAL, COEFFICIENT_ELEMENTS } from './presets'
import { World, WorldClass } from '@rpgjs/sync-server'
import { Utils, RpgPlugin, Scheduler, HookServer, RpgCommonGame } from '@rpgjs/common'
import { WorldMap } from './Game/WorldMaps';

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

    public assetsPath: string = 'assets'

    /**
     * Combat formulas
     * 
     * @prop {object} [damageFormulas]
     * @memberof RpgServerEngine
     */
    public damageFormulas: any = {}

    public serverId: string = process.env.SERVER_ID || Utils.generateUID()

    private scenes: Map<string, any> = new Map()
    protected totalConnected: number = 0
    private scheduler: Scheduler
    private tick: number = 0
    private playerProps: any

    world: WorldClass = World
    workers: any

    /**
     * Combat formulas
     * 
     * @prop {Socket Io Server} [io]
     * @memberof RpgServerEngine
     */
    constructor(public io, public gameEngine: RpgCommonGame, public inputOptions) {
        if (this.inputOptions.workers) {
            console.log('workers enabled')
            this.workers = this.gameEngine.createWorkers(this.inputOptions.workers).load()
        }
    }

    private async _init() {
        this.damageFormulas = this.inputOptions.damageFormulas || {}
        this.damageFormulas = {
            damageSkill: DAMAGE_SKILL,
            damagePhysic: DAMAGE_PHYSIC,
            damageCritical: DAMAGE_CRITICAL,
            coefficientElements: COEFFICIENT_ELEMENTS,
            ...this.damageFormulas
        }

        this.globalConfig = this.inputOptions.globalConfig
        if (this.globalConfig.assetsPath) this.assetsPath = this.globalConfig.assetsPath

        if (!this.inputOptions.maps) this.inputOptions.maps = []
        if (!this.inputOptions.worldMaps) this.inputOptions.worldMaps = []
        this.playerProps = this.inputOptions.playerProps

        this.inputOptions.maps = [
            ...Utils.arrayFlat(await RpgPlugin.emit(HookServer.AddMap, this.inputOptions.maps)) || [],
            ...this.inputOptions.maps
        ]

        this.inputOptions.worldMaps = [
            ...Utils.arrayFlat(await RpgPlugin.emit(HookServer.AddWorldMaps, this.inputOptions.worldMaps)) || [],
            ...this.inputOptions.worldMaps
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
        this.scheduler = new Scheduler({
            tick: this.step.bind(this),
            period: 1000 / this.inputOptions.stepRate,
            delay: 4
        })
        if (scheduler) this.scheduler.start()
        this.gameEngine.start({
            getObject(id) {
                return Query.getPlayer(id) 
            },
            getObjectsOfGroup(groupId: string, player: RpgPlayer) {
                return Query._getObjectsOfMap(groupId, player)
            },
            getShapesOfGroup(map: string) {
                return Query._getShapesOfGroup(map)
            }
        })
        this.io.on('connection', this.onPlayerConnected.bind(this))
        await RpgPlugin.emit(HookServer.Start, this)
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

    private updatePlayersMove(deltaTimeInt: number) {
        const players = this.world.getUsers() 
        const obj: any = []
        let p: Promise<any>[] = []
        let id = Math.random()
        for (let playerId in players) {
            const player = players[playerId] as RpgPlayer
            if (player.pendingMove.length > 0) {
                const lastFrame = player.pendingMove[player.pendingMove.length-1]
                if (this.inputOptions.workers) obj.push(player.toObject())
                else {
                    p.push(this.gameEngine.processInput(playerId).then(() => {
                        player.pendingMove = []
                        player._lastFrame = lastFrame.frame
                        player._lastFramePositions.set(lastFrame.frame, {...player.position})
                    }))
                }
            }
        }
        if (this.inputOptions.workers) {
            this.workers.call('movePlayers', obj).then((players) => {
                for (let playerId in players) {
                    const player = this.world.getUser(playerId) as RpgPlayer
                    const data = players[playerId]
                    if (player) {
                        player.position = data.position
                        player.direction = data.direction
                    }
                    RpgPlugin.emit('Server.onInput', [player, {
                        input: data.direction,
                        moving: true
                    }], true)
                }
            })
        }
        return Promise.all(p)
    }

    step(t: number, dt: number) {
        this.tick++
        this.updatePlayersMove(1) 
        if (this.tick % 4 === 0) {
            this.send() 
        }
        RpgPlugin.emit(HookServer.Step, this)
    }

    private loadScenes() {
        this.scenes.set(SceneMap.id, new SceneMap(this.inputOptions.maps, this.inputOptions.worldMaps, this))
    }

    getScene<T>(name: string): T {
        return this.scenes.get(name)
    }

    /**
     * Return the scene that manages the maps of the game
     * @prop {SceneMap} [sceneMap]
     * @since 3.0.0-beta.4
     * @memberof RpgServerEngine
     */
    get sceneMap(): SceneMap {
        return this.getScene<SceneMap>(SceneMap.id)
    }

    sendToPlayer(currentPlayer, eventName, data) {
        currentPlayer._socket.emit(eventName, data)
    }

    private onPlayerConnected(socket) {
        const { token } = socket.handshake.auth
        const playerId = Utils.generateUID()
        const player: RpgPlayer = new RpgPlayer(this.gameEngine, playerId)
        player.session = token

        socket.on('move', (data: { input: string[], frame: number }) => {
            for (let input of data.input) {
                player.pendingMove.push({
                    input,
                    frame: data.frame
                })
            }
        })

        socket.on('disconnect', () => {
            this.onPlayerDisconnected(socket.id, playerId)
        })

        this.world.setUser(player, socket)

        player.server = this
        player._init()

        if (!token) {
            const newToken = Utils.generateUID() + '-' + Utils.generateUID() + '-' + Utils.generateUID()
            player.session = newToken
        }

        socket.emit('playerJoined', { playerId, session: player.session })

        if (!token) {
            player.execMethod('onConnected')
        }
        else {
            RpgPlugin.emit(HookServer.ScalabilityPlayerConnected, player)
        }
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