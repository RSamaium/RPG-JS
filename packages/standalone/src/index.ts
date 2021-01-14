import { MockIo } from '@rpgjs/common'
import { entryPoint as entryPointServer } from '@rpgjs/server'
import { entryPoint as entryPointClient } from '@rpgjs/client'

const { ClientIo, serverIo } = MockIo

export function entryPoint(clientClass, serverClass) {
    const io = new ClientIo()
    const server = entryPointServer(serverClass, serverIo, {
        standalone: true
    })
    const client = entryPointClient(clientClass, { 
        standalone: true,
        io
    })
   return {
       start() {
            server.start()
            client.start()
       }
   }
}