
import http from 'http'
import express from 'express'
import bodyParser from 'body-parser'
import { Server } from 'socket.io'
import { entryPoint, RpgWorld, Direction, Move } from '@rpgjs/server'
import globalConfig from './config/server'
import modules from './modules' 
import PrettyError from 'pretty-error'


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

app.use(bodyParser.json()) 

/*app.use('/metrics', async (req, res) => {
    res.setHeader('Content-Type', register.contentType)
    res.end(await register.metrics())
})*/

app.use('/', express.static(__dirname + '/../client'))

server.listen(PORT, async () =>  {
    const rpgGame = await entryPoint(modules, { io, basePath: __dirname, globalConfig })
    rpgGame.app = app
    rpgGame.start()
    console.log(`
        ===> MMORPG is running on http://localhost:${PORT} <===
    `) 
}) 

process.on('uncaughtException', function(error){
    console.log(pe.render(error))
})   

process.on('unhandledRejection', function(reason: any){
    console.log(pe.render(reason))  
}) 