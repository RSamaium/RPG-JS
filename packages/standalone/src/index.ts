import { MockIo } from '@rpgjs/common'
import { entryPoint as entryPointServer } from '@rpgjs/server'
import { entryPoint as entryPointClient } from '@rpgjs/client'

const { ClientIo, serverIo } = MockIo

export function entryPoint(modules) {
    const io = new ClientIo()
    const server = entryPointServer(modules, {
        io: serverIo,
        standalone: true,
        basePath: ''
    })
    const client = entryPointClient(modules, { 
        standalone: true,
        io
    })
   return {
       async start() {
            await server.start()
            await client.start()
       }
   }
}