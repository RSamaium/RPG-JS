
import http from 'http'
import express from 'express'
import socketIO from 'socket.io'
import { entryPoint } from '@rpgjs/server'
import RPG from './rpg'

const PORT = process.env.PORT || 3000

const app = express()
const server = http.createServer(app)
const io = socketIO(server)
const rpgGame = entryPoint(RPG, io)

app.use('/', express.static(__dirname + '/../client'))

server.listen(PORT, () =>  {
    rpgGame.start()
    console.log(`
        ===> MMORPG is running on http://localhost:${PORT} <===
    `)
})