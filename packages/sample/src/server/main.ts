
import http from 'http'
import express from 'express'
import socketIO from 'socket.io'
import { entryPoint, Monitor } from '@rpgjs/server'
import RPG from './rpg'

const PORT = process.env.PORT || 3000

const app = express()
const server = http.createServer(app)
const io = socketIO(server)
const rpgGame = entryPoint(RPG, io)

app.use('/', express.static(__dirname + '/../client'))

setInterval(() => {
    console.log(Monitor.status)
}, 1000)

server.listen(PORT, () =>  {
    rpgGame.start()
    console.log(`MMORPG is running on ${PORT}`)
})