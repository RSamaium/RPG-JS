import { createServer } from 'vite'
import { clientBuildConfig } from '../build/client-config.js'
import { runServer } from './run-server.js'
import portfinder from 'portfinder'
import colors from 'picocolors'
import * as hmr from 'vite-node/hmr'
import Joi from 'joi'
import path from 'path'

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
    process.env.NODE_ENV = 'development'
    const cwd = process.cwd()

    const colorUrl = (url: string) =>
        colors.cyan(url.replace(/:(\d+)\//, (_, port) => `:${colors.bold(port)}/`))

    async function restartViteServer(server, close?: () => Promise<void>) {
        server.watcher.add(path.resolve(process.cwd(), 'rpg.toml'))

        server.watcher.on('change', async (file: string) => {
            if (file.endsWith('rpg.toml')) {
                console.log(`  ${colors.green('➜')}  ${colors.bold('rpg.toml changed. Restarting')} server...`)
                await server.close()
                if (close) await close()
                await devMode(options)
            }
        });
    }

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
        restartViteServer(server)
        return
    }

    let server

    const buildEnd = async () => {
        const { runner, server: serverSide, files, node } = await runServer()
        console.log(`  ${colors.green('➜')}  ${colors.bold('Mode')}:    ${colorUrl('MMORPG')}`)
        server.printUrls()
        console.log(`  ${colors.dim('➜')}  ${colors.dim('Server')}:  ${colors.dim(`http://localhost:${serverPort}/`)}`)
        restartViteServer(server, async () => {
            await hmr.handleMessage(runner, serverSide.emitter, [], {
                type: 'full-reload',
            })
            serverSide.emitter.removeAllListeners()
        })
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