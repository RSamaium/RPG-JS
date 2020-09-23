import { clientIo, serverIo } from './src/common/mock/io'
import { entryPoint as entryPointServer } from './server'
import { entryPoint as entryPointClient } from './client'

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