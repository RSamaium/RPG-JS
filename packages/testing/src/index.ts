import { HookClient, ModuleType, RpgPlugin } from '@rpgjs/common'
import { entryPoint, RpgServerEngine, RpgMap, RpgWorld, RpgPlayer } from '@rpgjs/server'
import { entryPoint as entryPointClient, RpgClientEngine } from '@rpgjs/client'
import { ObjectFixtureList, Position } from '@rpgjs/types'
import { MockSocketIo } from 'simple-room'

const { serverIo, ClientIo } = MockSocketIo

type ClientTesting = {
    client: RpgClientEngine,
    socket: any,
    playerId: string
    player: RpgPlayer
}

type PositionMap = string | Position

interface Testing {
    /**
     * Allows you to create a client and get fixtures to manipulate it during tests
     * 
     * Returns:
     * 
     * ```ts
     * {
     *      client: RpgClientEngine,
     *      socket: any,
     *      playerId: string
     *      player: RpgPlayer
     * }
     * ```
     * 
     * @title Create Client
     * @method createClient()
     * @returns {Promise<ClientTesting>}
     * @memberof FixtureTesting
     */
    createClient(): Promise<ClientTesting>,

    /**
     * Create another client, add it to the map and send the information to the first client
     * 
     * @title Add Other Client In Map
     * @method addOtherClientInMap(firstClient,mapId,position?)
     * @param {RpgClientEngine} firstClient
     * @param {string} mapId
     * @param {Position | string} [position]
     * @returns {Promise<ClientTesting>}
     * @since 3.2.0
     * @memberof FixtureTesting
     */
    addOtherClientInMap(firstClient: RpgClientEngine, mapId: string, position?: PositionMap): Promise<ClientTesting>

    /**
     * Get server
     * 
     * @prop {RpgServerEngine} server
     * @memberof FixtureTesting
     */
    server: RpgServerEngine

    /**
     * Allows you to change the map. This function on the tests also allows to render with PIXI on the client side
     * 
     * @title Change Map
     * @method changeMap(client,mapId,position?)
     * @param {RpgClientEngine} client
     * @param {string} mapId
     * @param {Position | string} [position]
     * @returns {Promise<void>}
     * @memberof FixtureTesting
     */
    changeMap(client: RpgClientEngine, mapId: string, position?: PositionMap): Promise<void>
}

let server: RpgServerEngine
let clients: RpgClientEngine[]

function changeMap(client: RpgClientEngine, server: RpgServerEngine, mapId: string, position?: PositionMap): Promise<void> {
    return new Promise(async (resolve: any) => {
        let player = RpgWorld.getPlayer(client.playerId)

        const beforeLoading = () => {
            client.PIXI.utils.clearTextureCache()
        }

        const afterLoading = () => {
            client.nextFrame(0) 
            RpgPlugin.off(HookClient.BeforeSceneLoading, beforeLoading)
            RpgPlugin.off(HookClient.AfterSceneLoading, afterLoading)
            resolve()
        }

        RpgPlugin.on(HookClient.BeforeSceneLoading, beforeLoading)
        RpgPlugin.on(HookClient.AfterSceneLoading, afterLoading)
        
        await player.changeMap(mapId, position)
    })
}

/**
 * Allows you to test modules
 * 
 * @title Testing
 * @method testing(modules,optionsServer?,optionsClient?)
 * @param {ModuleType[]} modules
 * @param {object} [optionsServer]
 * @param {object} [optionsClient]
 * @returns {Promise<FixtureTesting>}
 * @example
 * 
 * ```ts
 * import { testing } from '@rpgjs/testing';
 * import { beforeEach } from 'vitest';
 * 
 *  beforeEach(async () => {
 *      const fixture = await testing([
 *          {
 *              server: RpgServerModule
 *          },
 *      ]);
 *      const clientFixture = await fixture.createClient();
 *      currentPlayer = clientFixture.player;
 * });
 * 
 * @memberof Testing
 */
export async function testing(modules: ModuleType[], optionsServer: any = {}, optionsClient: any = {}): Promise<Testing> {
    RpgPlugin.clear()
    const engine = await entryPoint(modules, {
        io: serverIo,
        standalone: true,
        disableAuth: true,
        ...optionsServer
    })
    engine.start(null, false)
    server = engine
    clients = []

    const createClient = async function createClient() {
        const client = entryPointClient(modules, {
            io: new ClientIo(),
            standalone: true,
            ...optionsClient
        })
        await client.start({
            renderLoop: false
        })
        clients.push(client)
        client.renderer.transitionMode = 0
        const playerId = client.playerId
        return {
            client,
            socket: client.socket,
            playerId,
            player: RpgWorld.getPlayer(playerId)
        }
    }

    const _changeMap = function (client: RpgClientEngine, mapId: string, position?: PositionMap) {
        return changeMap(client, server, mapId, position)
    }

    return {
        createClient,
        async addOtherClientInMap(firstClient: RpgClientEngine, mapId: string, position?: PositionMap) {
            const clientFixture = await createClient()
            const client = clientFixture.client
            await _changeMap(client, mapId, position)
            await nextTick(firstClient)
            return clientFixture
        },
        server: engine,
        changeMap: _changeMap
    }
}

/**
 * Clear caches. Use it after the end of each test
 * 
 * ```ts
 * import { clear } from '@rpgjs/testing'
 * import { afterEach } from 'vitest'
 * 
 * afterEach(() => {
 *      clear()
 * })
 * ```
 * 
 * @title Clear
 * @method clear()
 * @returns {void}
 * @memberof Testing
 */
export function clear(): void {
    server?.world.clear()
    clients?.forEach(client => client.reset())
    RpgMap.buffer.clear()
    RpgPlugin.clear()
    serverIo.clear()
    serverIo.events.clear()
    window.document.body.innerHTML = `<div id="rpg"></div>`
}

/**
 * Allows you to make a tick:
 * 1. on server
 * 2. server sends data to client
 * 3. Client retrieves data and performs inputs (move, etc.) and server reconciliation
 * 4. A tick is performed on the client
 * 5. A tick is performed on VueJS
 * 
 * @title Next Tick
 * @method nextTick(client,timestamp?)
 * @param {RpgClientEngine} client
 * @param {number} [timestamp=0] A predefined timestamp
 * @returns {Promise<ObjectFixtureList>}
 * @memberof Testing
 */
export async function nextTick(client: RpgClientEngine, timestamp = 0): Promise<ObjectFixtureList> {
    server.nextTick(timestamp)
    await server.send()
    return new Promise((resolve: any) => {
        client.objects.subscribe(async (objects) => {
            await client.processInput()
            client.nextFrame(timestamp)
            await client.vueInstance.$nextTick()
            resolve(objects)
        })
    })
}

/**
 * @title Wait a moment
 * @method waitUntil(promise)
 * @param {Promise<any>} promise
 * @returns {Promise<any>}
 * @since 4.0.0
 * @memberof Testing
 * @example
 * 
 * ```ts
 * await waitUntil(
 *  player.moveRoutes([Move.right()])
 * )
 * ```
 */
export function waitUntil(promise: Promise<any>): Promise<any> {
    let tick = 0
    let finish = false
    return new Promise((resolve: any, reject: any) => {
        promise.then(() => {
            finish = true
            resolve()
        }).catch(reject)
        const timeout = () => {
            setTimeout(() => {
                if (!finish) {
                    tick++
                    server.nextTick(tick)
                    timeout()
                }
            }, 50)
        }
        timeout()
    })
}