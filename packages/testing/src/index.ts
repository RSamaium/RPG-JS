import { HookClient, HookServer, MockIo, ModuleType, RpgPlugin } from '@rpgjs/common'
import { entryPoint, RpgServerEngine, RpgMap, RpgWorld, RpgPlayer } from '@rpgjs/server'
import { entryPoint as entryPointClient, RpgClientEngine } from '@rpgjs/client'
import { ObjectFixtureList, Position } from '@rpgjs/types'

const { serverIo, ClientIo } = MockIo

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
     * @title Create Client
     * @method createClient()
     * @return {Promise<ClientTesting>}
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
     * @return {Promise<ClientTesting>}
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
     * @return {Promise<void>}
     * @memberof FixtureTesting
     */
    changeMap(client: RpgClientEngine, mapId: string, position?: PositionMap): Promise<void>
}

let server: RpgServerEngine
let clients: RpgClientEngine[]

function changeMap(client: RpgClientEngine, server: RpgServerEngine, mapId: string, position?: PositionMap): Promise<void> {
    return new Promise(async (resolve: any) => {
        let player = RpgWorld.getPlayer(client.playerId)
        RpgPlugin.off(HookClient.BeforeSceneLoading)
        RpgPlugin.off(HookClient.AfterSceneLoading)
        RpgPlugin.on(HookClient.BeforeSceneLoading, () => {
            PIXI.utils.clearTextureCache()
        })
        RpgPlugin.on(HookClient.AfterSceneLoading, () => {
            client.nextFrame(0) // render scene
            resolve()
        })
        await player.changeMap(mapId, position)
    })
}

/**
 * Allows you to test modules
 * 
 * @method testing(modules,optionsServer?,optionsClient?)
 * @param {ModuleType[]} modules
 * @param {object} [optionsServer]
 * @param {object} [optionsClient]
 * @return {Promise<Testing>}
 * @memberof Testing
 */
export async function testing(modules: ModuleType[], optionsServer: any = {}, optionsClient: any = {}): Promise<Testing> {
    RpgPlugin.clear()
    const engine = await entryPoint(modules, {
        io: serverIo,
        standalone: true,
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
        const playerId = client['gameEngine'].playerId
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
 * 
 * // with jest
 * afterEach(() => {
 *      clear()
 * })
 * ```
 * 
 * @method clear()
 * @return {void}
 * @memberof Testing
 */
export function clear(): void {
    server.world.clear()
    clients.forEach(client => client.reset())
    RpgMap.buffer.clear()
    RpgPlugin.clear()
    serverIo.clear()
    for (let textureUrl in PIXI.utils.BaseTextureCache) {
        delete PIXI.utils.BaseTextureCache[textureUrl]
    }
    for (let textureUrl in PIXI.utils.TextureCache) {
        delete PIXI.utils.TextureCache[textureUrl]
    }
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
 * @method nextTick(client,timestamp?)
 * @param {RpgClientEngine} client
 * @param {number} [timestamp=0] A predefined timestamp
 * @return {Promise<ObjectFixtureList>}
 * @memberof Testing
 */
export function nextTick(client: RpgClientEngine, timestamp = 0): Promise<ObjectFixtureList> {
    server.nextTick(timestamp)
    server.send()
    return new Promise((resolve: any) => {
        client.objects.subscribe(async (objects) => {
            await client.processInput()
            client.nextFrame(timestamp)
            await client.vueInstance.$nextTick()
            resolve(objects)
        })
    })
}
