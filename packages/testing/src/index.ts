import { serverIo, ClientIo } from '@rpgjs/common/src/transports/io'
import { entryPoint } from '@rpgjs/server'
import { Client } from './client'

export function testing(rpgServer) {
    const engine = entryPoint(rpgServer, serverIo)
    engine.start()
    return {
        createClient() {
            return new Client(new ClientIo())
        },
        server: engine
    }
}