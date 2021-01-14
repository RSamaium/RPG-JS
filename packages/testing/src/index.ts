import { MockIo } from '@rpgjs/common'
import { entryPoint } from '@rpgjs/server'
import { Client } from './client'

const { serverIo, ClientIo } = MockIo

export function testing(rpgServer) {
    const engine = entryPoint(rpgServer, serverIo)
    engine.start()
    return {
        createClient(): Client {
            return new Client(new ClientIo())
        },
        server: engine
    }
}