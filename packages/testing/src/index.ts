import { mergeConfig } from "@signe/di";
import { provideRpg, startGame, provideClientModules, provideLoadMap, provideClientGlobalConfig } from "@rpgjs/client";
import { createServer, provideServerModules } from "@rpgjs/server";

export function provideTestingLoadMap() {
    return provideLoadMap((id: string) => {
        return {
            id,
            component: null,
        }
    })
}

export async function testing(modules: any[], clientConfig: any = {}, serverConfig: any = {}) {
    return {
        createClient: () => {
            const server = createServer({
                ...serverConfig,
                providers: [
                    provideServerModules(modules),
                    ...(serverConfig.providers || [])
                ]
            })
            const client = startGame(
                mergeConfig({
                    ...clientConfig,
                    providers: [
                        provideClientGlobalConfig({}),
                        provideTestingLoadMap(),
                        provideClientModules(modules),
                        ...(clientConfig.providers || [])
                    ]
                }, {
                    providers: [provideRpg(server)],
                })
            )
            return {
                server,
                client,
            }
        }
    }
}