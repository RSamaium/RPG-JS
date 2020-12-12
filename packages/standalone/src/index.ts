import { ClientIo, serverIo } from '@rpgjs/common/src/transports/io'
import { entryPoint as entryPointServer } from '@rpgjs/server'
import { entryPoint as entryPointClient } from '@rpgjs/client'

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