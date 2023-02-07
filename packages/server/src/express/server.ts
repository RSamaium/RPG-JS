
import http from 'http'
import express from 'express'
import { Server } from 'socket.io'
import entryPoint from '../entry-point'
import PrettyError from 'pretty-error'
import { ModuleType } from '@rpgjs/common'

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
        app.use('/', express.static(dirname + '/../dist/client'))

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

        if (import.meta.hot) {
            import.meta.hot.on("vite:beforeFullReload", () => {
                console.log("full reload");
                server.close();
            });
        }
    })
}