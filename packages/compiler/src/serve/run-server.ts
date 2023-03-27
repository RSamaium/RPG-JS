import { createServer } from "vite"
import { ViteNodeServer } from 'vite-node/server'
import { ViteNodeRunner } from 'vite-node/client'
import { createHotContext, handleMessage, viteNodeHmrPlugin } from 'vite-node/hmr'
import { installSourcemapsSupport } from 'vite-node/source-map'
import { clientBuildConfig } from "../build/client-config.js"
import path from 'path'

export async function runServer() {

    const config = await clientBuildConfig(process.cwd(), {
        serveMode: true,
        type: 'mmorpg',
        side: 'server',
        plugins: [
            viteNodeHmrPlugin()
        ],
        overrideOptions: {
            optimizeDeps: {
                disabled: false,
            }
        }
    })

    // create vite server
    const server = await createServer(config)

    // this is need to initialize the plugins
    await server.pluginContainer.buildStart({})

    // create vite-node server
    const node = new ViteNodeServer(server, {})

    const files = ['./src/server.ts']

    // fixes stacktraces in Errors
    installSourcemapsSupport({
        getSourceMap: source => node.getSourceMap(source),
    })

    // create vite-node runner
    const runner = new ViteNodeRunner({
        root: path.join(server.config.root, '..') ,
        base: server.config.base,
        // when having the server and runner in a different context,
        // you will need to handle the communication between them
        // and pass to this function
        fetchModule(id) {
            if (id.endsWith('.tmx')) {
                return node.fetchModule(id).then((res: any) => {
                    res.code = res.code.replace(/\/src/g, 'src') 
                    return res
                })
            }
            return node.fetchModule(id)
        },
        resolveId(id, importer) {
            return node.resolveId(id, importer)
        },
        createHotContext(runner, url) {
            return createHotContext(runner, server.emitter, files, url)
        }
    })

    // execute the file
    await runner.executeFile(files[0])

    server.emitter?.on('message', (payload) => {
        handleMessage(runner, server.emitter, files, payload)
    })
}