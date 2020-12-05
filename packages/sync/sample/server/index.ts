import { World } from '../../src'

import express from 'express'
import http from 'http'

import { Page } from './room'

const app = express()
const server = http.createServer(app)
const io = require("socket.io")(server)



World.transport(io)
World.addRoom('page', Page)

setInterval(() => {
    World.send()
}, 100)

app.use('/', express.static(__dirname + '/../client'))

server.listen(3000, () => {
    console.log('listening on *:3000');
});

