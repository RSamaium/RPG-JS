import { mergeConfig } from "@signe/di";
import { provideRpg, startGame, provideClientModules, provideLoadMap, provideClientGlobalConfig, inject, WebSocketToken, AbstractWebsocket, RpgClientEngine, RpgClient } from "@rpgjs/client";
import { createServer, provideServerModules, RpgServer, RpgPlayer } from "@rpgjs/server";

export function provideTestingLoadMap() {
    return provideLoadMap((id: string) => {
        return {
            id,
            component: null,
        }
    })
}

export async function testing(modules: {
    server: RpgServer,
    client: RpgClient
}[] = [], clientConfig: any = {}, serverConfig: any = {}) {
    const serverClass = createServer({
        ...serverConfig,
        providers: [
            provideServerModules(modules),
            ...(serverConfig.providers || [])
        ]
    })
    return {
        async createClient() {
            const client = await startGame(
                mergeConfig({
                    ...clientConfig,
                    providers: [
                        provideClientGlobalConfig({}),
                        provideTestingLoadMap(),
                        provideClientModules(modules),
                        ...(clientConfig.providers || [])
                    ]
                }, {
                    providers: [provideRpg(serverClass)],
                })
            )
            const websocket = inject<AbstractWebsocket>(WebSocketToken)
            const clientEngine = inject<RpgClientEngine>(RpgClientEngine)
            const server = websocket.getServer()
            return {
                server,
                socket: websocket.getSocket(),
                client: clientEngine,
                playerId: clientEngine.playerId,
                get player(): RpgPlayer {
                    return server.subRoom.players()[clientEngine.playerId] as RpgPlayer
                }
            }
        }
    }
}