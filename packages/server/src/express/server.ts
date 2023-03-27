import http from 'http'
import path from 'path'
import express from 'express'
import { Server } from 'socket.io'
import entryPoint from '../entry-point'
import PrettyError from 'pretty-error'
import { ModuleType } from '@rpgjs/common'
import { createProxyMiddleware } from 'http-proxy-middleware';

type ExpressServerOptions = {
    basePath: string,
    globalConfig?: any,
}

export function expressServer(modules: ModuleType[], options: ExpressServerOptions) {
    return new Promise((resolve, reject) => {
        const dirname = options.basePath
        const PORT = process.env.PORT || 3000
        const pe = new PrettyError()
        const app = express()
        const server = http.createServer(app)
        const io = new Server(server, {
            maxHttpBufferSize: 1e10,
            cors: {
                origin: "*",
                methods: ["GET", "POST"]
            }
        })

        app.use(express.json())

        // @ts-ignore
        const hasStatic = !!import.meta.env.STATIC_DIRECTORY_ENABLED === false ? true : !!import.meta.env.STATIC_DIRECTORY_ENABLED
        // @ts-ignore
        const staticDirectory = !!import.meta.env.VITE_BUILT ? '' : 'dist'

        if (hasStatic) {
            //app.use('/', express.static(path.join(dirname, '..', staticDirectory, 'client')))
            //app.use('/', createProxyMiddleware({ target: 'http://localhost:5173', changeOrigin: true }));
        }
    
        async function start() {
            const rpgGame = await entryPoint(modules, { io, ...options })
            rpgGame.app = app
            rpgGame.start()
            console.log(`
                ===> MMORPG is running on http://localhost:${PORT} <===
            `)
            resolve({
                app,
                server,
                game: rpgGame
            })
        }

        server.listen(PORT, start)

        process.on('uncaughtException', function (error) {
            console.log(pe.render(error))
        })

        process.on('unhandledRejection', function (reason: any) {
            console.log(pe.render(reason))
        })

        if (import.meta['hot']) {
            import.meta['hot'].on("vite:beforeFullReload", () => {
                server.close();
            });
        }
    })
}