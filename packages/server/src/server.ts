import { SceneMap } from './Scenes/Map';
import { RpgPlayer } from './Player/Player'
import { Query } from './Query'
import { DAMAGE_SKILL, DAMAGE_PHYSIC, DAMAGE_CRITICAL, COEFFICIENT_ELEMENTS } from './presets'
import { World, WorldClass, Transport } from 'simple-room'
import { Utils, RpgPlugin, Scheduler, HookServer, RpgCommonGame, DefaultInput } from '@rpgjs/common'
import { Observable } from 'rxjs';
import { Tick } from '@rpgjs/types';
import { Actor, Armor, Class, DatabaseTypes, Item, Skill, State, Weapon } from '@rpgjs/database';
import { inject } from './inject';

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

    public serverId: string = process.env.SERVER_ID || Utils.generateUID()

    private scenes: Map<string, any> = new Map()
    protected totalConnected: number = 0
    private scheduler: Scheduler = new Scheduler()
    private playerProps: any
    public gameEngine: RpgCommonGame = inject(RpgCommonGame)

    world: WorldClass = World
    workers: any
    envs: any = {}
    io: any
    inputOptions: any = {}

    /**
     * Combat formulas
     * 
     * @prop {Socket Io Server} [io]
     * @memberof RpgServerEngine
     */
    initialize(io, inputOptions) {
        this.io = io
        this.inputOptions = inputOptions
        this.envs = inputOptions.envs || {}
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

        if (!this.inputOptions.maps) this.inputOptions.maps = []
        if (!this.inputOptions.events) this.inputOptions.events = []
        if (!this.inputOptions.worldMaps) this.inputOptions.worldMaps = []
        this.playerProps = this.inputOptions.playerProps

        this.inputOptions.maps = [
            ...Utils.arrayFlat(await RpgPlugin.emit(HookServer.AddMap, this.inputOptions.maps)) || [],
            ...this.inputOptions.maps
        ]

        this.inputOptions.events = [
            ...Utils.arrayFlat(await RpgPlugin.emit(HookServer.AddEvent, this.inputOptions.events)) || [],
            ...this.inputOptions.events
        ]

        this.inputOptions.worldMaps = [
            ...Utils.arrayFlat(await RpgPlugin.emit(HookServer.AddWorldMaps, this.inputOptions.worldMaps)) || [],
            ...this.inputOptions.worldMaps
        ]

        this.globalConfig.inputs = {
            ...DefaultInput,
            ...(this.globalConfig.inputs || {})
        }

        if (!this.inputOptions.database) this.inputOptions.database = {}

        /**
         * data is array with object or array
         */
        const datas = await RpgPlugin.emit(HookServer.AddDatabase, this.inputOptions.database) || []

        for (let element of datas) {
            if (Array.isArray(element)) {
                for (let data of element) {
                    this.addInDatabase(data.id, data)
                }
            }
            else {
                for (let id in element) {
                    this.addInDatabase(element[id].id ?? id, element[id])
                }
            }
        }

        this.loadScenes()
    }

    /**
     * Adds data to the server's database (in RAM) for later use
     * 
     * 
     * @method server.addInDatabase(id,data)
     * @title Add in database
     * @param {number} id resource id
     * @param {class | object} dataClass A class representing the data. You can just add a object if you specify the type
     * @enum {string} [type] The type of data
     * 
     * item
     * weapon
     * armor
     * skill
     * class
     * state
     * actor
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
     * 
     * or with an object
     * 
     * ```ts
     * server.addInDatabase('dynamic_item', {
     *      name: 'Potion',
     *      description: 'Gives 100 HP',
     * }, 'item')
     * ```
     * 
     * @returns {void}
     * @memberof RpgServerEngine
     */
    addInDatabase(id: string, dataClass: any, type?: DatabaseTypes) {
        if (Utils.isClass(dataClass)) {
            this.database[id] = dataClass
            return
        }
        if (!type) {
            throw new Error(`You must specify a type for the database ${id}`)
        }
        switch (type) {
            case 'item':
                @Item(dataClass) class ItemClass { }
                this.database[id] = ItemClass
                break;
            case 'weapon':
                @Weapon(dataClass) class WeaponClass { }
                this.database[id] = WeaponClass
                break;
            case 'armor':
                @Armor(dataClass) class ArmorClass { }
                this.database[id] = ArmorClass
                break;
            case 'skill':
                @Skill(dataClass) class SkillClass { }
                this.database[id] = SkillClass
                break;
            case 'class':
                @Class(dataClass) class ClassClass { }
                this.database[id] = ClassClass
                break;
            case 'state':
                @State(dataClass) class StateClass { }
                this.database[id] = StateClass
                break;
            case 'actor':
                @Actor(dataClass) class ActorClass { }
                this.database[id] = ActorClass
                break;
        }
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
        this.tick.subscribe(({ timestamp, deltaTime }) => {
            this.step(timestamp, deltaTime)
        })
        if (scheduler) this.scheduler.start({
            fps: inputOptions?.fps || 60
        })
        this.gameEngine.start({
            getObject(id) {
                return Query.getPlayer(id)
            },
            getObjectsOfGroup(groupId: string, player: RpgPlayer) {
                return Query._getObjectsOfMap(groupId, player)
            },
            getShapesOfGroup(map: string) {
                return Query._getShapesOfMap(map)
            }
        })
        //this.io.on('connection', this.onPlayerConnected.bind(this))
        this.transport(this.io)
        await RpgPlugin.emit(HookServer.Start, this)
    }

    private transport(io): Transport {
        const timeoutDisconnect = this.globalConfig.timeoutDisconnect ?? 0
        const auth = this.globalConfig.disableAuth ? () => Utils.generateUID() :
            async (socket) => {
                const val = await RpgPlugin.emit(HookServer.Auth, [this, socket], true)
                if (val.length == 0) {
                    return Utils.generateUID()
                }
                return val[val.length - 1]
            }
        const transport = new Transport(io, {
            timeoutDisconnect,
            auth
        })
        this.world.timeoutDisconnect = timeoutDisconnect
        transport.onConnected(this.onPlayerConnected.bind(this))
        transport.onDisconnected(this.onPlayerDisconnected.bind(this))
        return transport
    }

    get tick(): Observable<Tick> {
        return this.scheduler.tick as any
    }

    /**
     * Sends all packages to clients. The sending is done automatically but you can decide to send yourself by calling this method (for example, for unit tests)
     * 
     * @method server.send()
     * @title Send All Packets
     * @returns {void}
     * @memberof RpgServerEngine
     */
    send(): Promise<void> {
        return this.world.send()
    }

    private async updatePlayersMove(deltaTimeInt: number) {
        const players = this.world.getUsers()
        const obj: any = []
        let p: Promise<RpgPlayer>[] = []
        for (let playerId in players) {
            const playerInstance = players[playerId]['proxy'] as RpgPlayer
            if (!playerInstance) continue
            const player = playerInstance.otherPossessedPlayer ?? playerInstance
            if (player.pendingMove.length > 0) {
                
                const lastFrame = player.pendingMove[player.pendingMove.length - 1]
                if (this.inputOptions.workers) obj.push(player.toObject())
                else {
                    p.push(this.gameEngine.processInput(player.playerId, this.globalConfig.inputs).then((val) => {
                        player.pendingMove = []
                        player.moving = false
                        player._lastFramePositions = {
                            frame: lastFrame.frame,
                            position: { ...player.position }
                        }
                        return player
                    }))
                }
            }
        }
        // TODO
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

    nextTick(timestamp: number) {
        this.scheduler.nextTick(timestamp)
    }

    step(t: number, dt: number) {
        this.updatePlayersMove(1)
        if (this.scheduler.frame % 4 === 0) {
            this.send()
        }
        RpgPlugin.emit(HookServer.Step, this)
    }

    private loadScenes() {
        this.scenes.set(SceneMap.id, new SceneMap(
            {
                maps: this.inputOptions.maps,
                events: this.inputOptions.events,
                worldMaps: this.inputOptions.worldMaps
            }
        ))
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

    get module() {
        return RpgPlugin
    }

    get assetsPath(): string {
        return this.envs?.['VITE_ASSETS_PATH'] || 'assets'
    }

    sendToPlayer(currentPlayer, eventName, data) {
        currentPlayer._socket.emit(eventName, data)
    }

    private getPlayerBySession(session: string): RpgPlayer | null {
        const users = this.world.getUsers<RpgPlayer>()
        for (let userId in users) {
            const user = users[userId]
            if (user.session === session) {
                return user
            }
        }
        return null
    }

    private onPlayerConnected(socket, playerId: string) {
        const existingUser = this.world.getUser<RpgPlayer>(playerId, false)

        this.world.connectUser(socket, playerId)

        let player: RpgPlayer

        if (!existingUser) {
            const { token } = socket.handshake.auth
            player = new RpgPlayer(playerId)
            player.session = token

            this.world.setUser(player, socket)

            player._init()

            if (!token) {
                const newToken = Utils.generateUID() + '-' + Utils.generateUID() + '-' + Utils.generateUID()
                player.session = newToken
            }

            if (!token) {
                player.execMethod('onConnected')
            }
            else {
                RpgPlugin.emit(HookServer.ScalabilityPlayerConnected, player)
            }
        }
        else {
            player = existingUser
            if (player.map) {
                player.emit('preLoadScene', {
                    reconnect: true,
                    id: player.map
                })
                player.emitSceneMap()
                this.world.joinRoom(player.map, playerId)
            }
        }

        socket.emit('playerJoined', { playerId, session: player.session })

        socket.on('move', (data: { input: string[], frame: number }) => {
            if (!data?.input) return
            if (!Array.isArray(data.input)) return
            const controlPlayer = player.otherPossessedPlayer ?? player
            if (!controlPlayer.canMove) {
                return
            }
            for (let input of data.input) {
                controlPlayer.pendingMove.push({
                    input,
                    frame: data.frame
                })
            }
        })

    }

    private onPlayerDisconnected(playerId: string) {
        const player: RpgPlayer = World.getUser(playerId) as RpgPlayer
        player.execMethod('onDisconnected')
        this.world.disconnectUser(playerId)
    }

    stop() {
        this.scheduler.stop()
    }
}