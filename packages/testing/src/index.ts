import { MockIo } from '@rpgjs/common'
import { entryPoint } from '@rpgjs/server'
import { entryPoint as entryPointClient } from '@rpgjs/client'

const { serverIo, ClientIo } = MockIo

export function testing(modules, options) {
    const engine = entryPoint(modules, { 
        io: serverIo,
        standalone: true,
        ...options
    })
    engine.start()
    return {
        async createClient() {
            const client = entryPointClient(modules, {
                io: new ClientIo(),
                standalone: true
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