import { HookClient, HookServer, MockIo, RpgPlugin } from '@rpgjs/common'
import { entryPoint, RpgServerEngine, RpgMap, RpgWorld, RpgPlayer } from '@rpgjs/server'
import { entryPoint as entryPointClient, RpgClientEngine } from '@rpgjs/client'
import { Position } from '@rpgjs/types'

const { serverIo, ClientIo } = MockIo

type ClientTesting = {
    client: RpgClientEngine,
    socket: any,
    playerId: string
    player: RpgPlayer
}

type PositionMap = string | Position

interface Testing {
    createClient(): Promise<ClientTesting>,
    addOtherClientInMap(firstClient: RpgClientEngine, mapId: string, position?: PositionMap): Promise<ClientTesting>
    server: RpgServerEngine
    changeMap(client: RpgClientEngine, mapId: string, position?: PositionMap): Promise<void>
}

let server: RpgServerEngine
let clients: RpgClientEngine[]

function changeMap(client: RpgClientEngine, server: RpgServerEngine, mapId: string, position?: PositionMap): Promise<void>{
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

export async function testing(modules, optionsServer: any = {}, optionsClient: any = {}): Promise<Testing> {
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

    const _changeMap = function(client: RpgClientEngine, mapId: string, position?: PositionMap) {
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

export function clear() {
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

export function nextTick(client: RpgClientEngine, timestamp = 0) {
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
