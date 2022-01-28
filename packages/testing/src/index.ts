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
            await client.start()
            clients.push(client)
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
}