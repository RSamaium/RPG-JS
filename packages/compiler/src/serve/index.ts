import { createServer } from 'vite'
import { clientBuildConfig } from '../build/client-config.js'
import { runServer } from './run-server.js'
import portfinder from 'portfinder'
import colors from 'picocolors'
import Joi from 'joi'

export interface DevOptions {
    host?: string;
    port?: number;
    open?: boolean;
    cors?: boolean;
    loglevel?: string;
    debug?: boolean;
}

export async function devMode(options: DevOptions = {}) {
    const isRpg = process.env.RPG_TYPE == 'rpg'
    const cwd = process.cwd()

    const colorUrl = (url: string) =>
        colors.cyan(url.replace(/:(\d+)\//, (_, port) => `:${colors.bold(port)}/`))

    if (isRpg) {
        const config = await clientBuildConfig(cwd, {
            type: 'rpg',
            serveMode: true,
            overrideOptions: {
                jsx: 'preserve',
                optimizeDeps: {
                    exclude: ['*.tsx']
                }
            },
            server: options
        })
        const server = await createServer(config)
        await server.listen()
        console.log(`  ${colors.green('➜')}  ${colors.bold('Mode')}:    ${colorUrl('RPG')}`)
        server.printUrls()
        return
    }

    let server

    const buildEnd = async () => {
        await runServer()
        console.log(`  ${colors.green('➜')}  ${colors.bold('Mode')}:    ${colorUrl('MMORPG')}`)
        server.printUrls()
        console.log(`  ${colors.dim('➜')}  ${colors.dim('Server')}:  ${colors.dim(`http://localhost:${serverPort}/`)}`)
    }
    const serverPort = await portfinder.getPortPromise()
    process.env.VITE_SERVER_URL = 'localhost:' + serverPort

    const config = await clientBuildConfig(cwd, {
        serveMode: true,
        buildEnd,
        server: {
            host: 'localhost',
            ...options
        }
    })

    server = await createServer(config)
    await server.listen()
}