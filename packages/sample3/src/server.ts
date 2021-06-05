
import http from 'http'
import express from 'express'
import { Server } from 'socket.io'
import { entryPoint } from '@rpgjs/server'
import modules from './game' 

const PORT = process.env.PORT || 3000

const app = express()
const server = http.createServer(app)
const io = new Server(server, {
    maxHttpBufferSize: 1e10,
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
})

const rpgGame = entryPoint(modules, { io, basePath: __dirname })
rpgGame.app = app

/*app.use('/metrics', async (req, res) => {
    res.setHeader('Content-Type', register.contentType)
    res.end(await register.metrics())
})*/

app.use('/', express.static(__dirname + '/../client'))

server.listen(PORT, () =>  {
    rpgGame.start() 
    console.log(`
        ===> MMORPG is running on http://localhost:${PORT} <===
    `)
}) 