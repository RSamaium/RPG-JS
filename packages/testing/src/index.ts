import { MockIo } from '@rpgjs/common'
import { entryPoint, RpgServerEngine } from '@rpgjs/server'
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

export function testing(modules, optionsServer: any = {}, optionsClient: any = {}): Testing {
    const engine = entryPoint(modules, { 
        io: serverIo,
        standalone: true,
        ...optionsServer
    })
    engine.start()
    return {
        async createClient() {
            const client = entryPointClient(modules, {
                io: new ClientIo(),
                standalone: true,
                ...optionsClient
            })
            await client.start()
            return {
                client,
                socket: client.socket,
                playerId: client['gameEngine'].playerId
            }
        },
        server: engine
    }
}