import { TransportIo } from '@rpgjs/common'
import { entryPoint as entryPointServer } from '@rpgjs/server'
import { entryPoint as entryPointClient } from '@rpgjs/client'

const { clientIo, serverIo } = TransportIo()

export function entryPoint(clientClass, serverClass) {
    const server = entryPointServer(serverClass, serverIo, {
        standalone: true
    })
    const client = entryPointClient(clientClass, { 
        standalone: true,
        io: clientIo
    })
   return {
       start() {
            server.start()
            client.start()
       }
   }
}