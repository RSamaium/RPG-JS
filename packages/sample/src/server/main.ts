
import http from 'http'
import express from 'express'
import socketIO from 'socket.io'
import { entryPoint, Monitor, Query } from '@rpgjs/server'
import RPG from './rpg'

const PORT = process.env.PORT || 3000

const app = express()
const server = http.createServer(app)
const io = socketIO(server)
const rpgGame = entryPoint(RPG, io)

app.use('/', express.static(__dirname + '/../client'))

let save = {bytesIn:0, bytesOut:0}

setInterval(() => {
    /*const player: any = Object.values(Query.worlds.objects)[0] 
    if (player && player.socket)  {
        const { bytesIn, bytesOut } = Monitor.getStatusOf(player.socket.id)
        const bandWidthIn = bytesIn - save.bytesIn
        const bandWidthOut = bytesOut - save.bytesOut 
        save = { bytesIn, bytesOut }
        //console.log(`In: ${ bytesIn / 1024 } Ko, Out ${ bytesOut / 1024 } Ko`)
        //console.log(`In: ${ bandWidthIn / 1024 } Kbits/s, Out: ${ bandWidthOut / 1024 } Kbits/s`)
    }*/
    //console.log(Monitor.status)
}, 1000)

server.listen(PORT, () =>  {
    rpgGame.start()
    console.log(`MMORPG is running on ${PORT}`)
})