import { build, createServer } from 'vite'
import { cleanDist } from '../build/clean-dist.js'
import { clientBuildConfig } from '../build/client-config.js'
import { runServer } from './run-server.js'

export async function devMode() {
    const isRpg = process.env.RPG_TYPE == 'rpg'
    const cwd = process.cwd()

    cleanDist()

    if (isRpg) {
        const config = await clientBuildConfig(cwd, {
            type: 'rpg',
            serveMode: true,
            overrideOptions: {
                jsx: 'preserve',
                optimizeDeps: {
                    exclude: ['*.tsx']
                }
            }
        })
        const server = await createServer(config)
        await server.listen()
        server.printUrls()
        return
    }

    const buildEnd = async () => {
        await runServer()
    }
    const config = await clientBuildConfig(cwd, { serveMode: true, buildEnd })
    await build(config)
}