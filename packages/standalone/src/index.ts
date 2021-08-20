import { MockIo, Utils } from '@rpgjs/common'
import { entryPoint as entryPointServer } from '@rpgjs/server'
import { entryPoint as entryPointClient } from '@rpgjs/client'

const { ClientIo, serverIo } = MockIo

export function entryPoint(modules, options = {}) {
    const io = new ClientIo()

    class Module {}

    class StandaloneGame {
        server: any
        client: any

        async start() {
            this.server = entryPointServer(modules, {
                io: serverIo,
                standalone: true,
                basePath: '',
                ...options
            })
            this.client = entryPointClient(modules, { 
                standalone: true,
                io,
                ...options
            })
            await this.server.start()
            await this.client.start()
        }

        private setHooks(hooks, side: string) {
            if (!Utils.isArray(hooks)) modules.push({
                [side]: hooks
            })
            else modules.concat(hooks.map(hook => {
                return {
                    [side]: hook
                }
            }))  
        }

        logicHooks(serverHooks) {
            this.setHooks(serverHooks, 'server')
        }

        renderHooks(clientHooks) {
            this.setHooks(clientHooks, 'client')
        }
    }
   return new StandaloneGame()
}