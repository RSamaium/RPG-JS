import { HookClient, HookServer, MockIo, RpgPlugin } from '@rpgjs/common'
import { entryPoint, RpgServerEngine, RpgMap } from '@rpgjs/server'
import { entryPoint as entryPointClient, RpgClientEngine } from '@rpgjs/client'

const { serverIo, ClientIo } = MockIo

interface Testing {
    createClient(): Promise<{
        client: RpgClientEngine,
        socket: any,
        playerId: string
    }>,
    server: RpgServerEngine
}

let server: RpgServerEngine
let clients: RpgClientEngine[]

export function testing(modules, optionsServer: any = {}, optionsClient: any = {}): Testing {
    RpgPlugin.clear()
    const engine = entryPoint(modules, { 
        io: serverIo,
        standalone: true,
        ...optionsServer
    })
    engine.start({}, false)
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
        server: engine
    }
}

export function clear() {
    server.world.clear()
    clients.forEach(client => client.reset())
    RpgMap.buffer.clear()
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
            client.nextFrame(timestamp)
            await client.vueInstance.$nextTick()
            resolve(objects)
        })
    })
}