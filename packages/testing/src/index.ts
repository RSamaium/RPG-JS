import { HookClient, HookServer, MockIo, RpgPlugin } from '@rpgjs/common'
import { entryPoint, RpgServerEngine, RpgMap, RpgWorld } from '@rpgjs/server'
import { entryPoint as entryPointClient, RpgClientEngine } from '@rpgjs/client'

const { serverIo, ClientIo } = MockIo

interface Testing {
    createClient(): Promise<{
        client: RpgClientEngine,
        socket: any,
        playerId: string
    }>,
    server: RpgServerEngine
    changeMap(client: RpgClientEngine, mapId: string): Promise<void>
}

let server: RpgServerEngine
let clients: RpgClientEngine[]

function changeMap(client: RpgClientEngine, server: RpgServerEngine, mapId: string): Promise<void>{
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
        await player.changeMap(mapId)
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
    return {
        async createClient() {
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
            return {
                client,
                socket: client.socket,
                playerId: client['gameEngine'].playerId
            }
        },
        server: engine,
        changeMap(client: RpgClientEngine, mapId: string) {
            return changeMap(client, server, mapId)
        }
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
    server.step(timestamp, 0)
    server.send()
    return new Promise((resolve: any) => {
        client.objects.subscribe(async (objects) => {
            client.processInput()
            client.nextFrame(timestamp)
            await client.vueInstance.$nextTick()
            resolve(objects)
        })
    })
}
