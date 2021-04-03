import { World } from '../src/world'
import { Transmitter } from '../src/transmitter'
import { testSend } from './fixture'
import { EventEmitter } from '@rpgjs/common'

let room: any

beforeEach(() => {
    World.transport(new EventEmitter())
    Transmitter.encode = false
})

beforeEach(() => {
    class Room {
        $schema = {
            users: [{
                id: String,
                x: Number,
                y: Number
            }]
        }

        onJoin(player) {
            player.x = 5
            player.y = 10
        }
    }

    room = World.addRoom('room', Room)
})

test('Test interpolation',  () => {
    return new Promise(async (resolve) => {
        const val = await testSend(room)

        const user = room.users['test']

        user._socket.emit = (ev, value) => {
            resolve()
        }

        World.send()
   })
})