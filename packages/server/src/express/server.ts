import http from 'http'
import path from 'path'
import express from 'express'
import cors from 'cors'
import { Server } from 'socket.io'
import entryPoint from '../entry-point'
import PrettyError from 'pretty-error'
import { ModuleType } from '@rpgjs/common'
import { RpgServerEngine } from '../server'
import { api } from './api'
import { Query } from '../Query'

type ExpressServerOptions = {
    basePath: string,
    globalConfig?: any,
    envs?: {
        [key: string]: string
    }
}

export function expressServer(modules: ModuleType[], options: ExpressServerOptions): Promise<{
    app: express.Express,
    server: http.Server,
    game: RpgServerEngine
}> {
    return new Promise((resolve, reject) => {
        const envs = options.envs || {}
        const { express: expressConfig = {} } = options.globalConfig || {}
        const dirname = options.basePath
        const PORT = process.env.PORT || expressConfig.port || 3000
        const pe = new PrettyError()
        const app = express()
        const server = http.createServer(app)
        const io = new Server(server, {
            maxHttpBufferSize: 1e10,
            cors: {
                origin: "*",
                methods: ["GET", "POST"]
            },
            ...(expressConfig.socketIo || {})
        })

        // @ts-ignore
        const isBuilt = !!envs.VITE_BUILT

        // @ts-ignore
        const hasStatic = process.env.STATIC_DIRECTORY_ENABLED
        const staticDirectory = isBuilt ? expressConfig.static ?? '' : 'dist'
        // @ts-ignore
        const staticEnabled = (isBuilt && hasStatic === undefined) || hasStatic === 'true'

        app.use(express.json(expressConfig.json))
        app.use(cors(expressConfig.cors))

        if (staticEnabled || expressConfig.static) {
            app.use('/', express.static(path.join(dirname, '..', staticDirectory, 'client')))
        }

        let rpgGame: RpgServerEngine

        async function start() {
            rpgGame = await entryPoint(modules, { io, ...options })
            rpgGame.app = app
            rpgGame.start()
            app.use('/api', api(rpgGame))
            app.use((err: any, req: any, res: any, next: any) => {
                const status = err.status || 500
                res.status(status).json({ error: err.message })
            })
            resolve({
                app,
                server,
                game: rpgGame
            })
        }

        // @ts-ignore
        const getPort = (url: string) => {
            const array = url.split(':')
            return array[array.length - 1]
        }
        console.log(envs.VITE_SERVER_URL)
        const serverPort = !isBuilt ? getPort(envs.VITE_SERVER_URL) || PORT : PORT
        server.listen(serverPort, start)

        process.on('uncaughtException', function (error) {
            console.log(pe.render(error))
        })

        process.on('unhandledRejection', function (reason: any) {
            console.log(pe.render(reason))
        })
    })
}