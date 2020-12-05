import { World } from '../src/world'
import { Transmitter } from '../src/transmitter'
import { EventEmitter } from '@rpgjs/common'

let event, socket

class SocketMock extends EventEmitter {
    client = {
        id: 'mock'
    }
}

beforeEach(() => {
    event = new EventEmitter()
    World.transport(event)
    socket = new SocketMock()
    event.emit('connection', socket)
    Transmitter.clear()
})

test('Test User in World', () => {
    const user = World.getUser('$mock')
    expect(user).toBeDefined()
    expect(user._rooms).toHaveLength(0)
})

test('Test Room properties', () => {
    class Room {
        $schema = {
            users: {}
        }
    }
    const room =  World.addRoom('room', Room)
    socket.emit(':join', 'room')
    const user = room.users['$mock']
    expect(user).toBeDefined()
    expect(user._socket).toBeDefined()
    expect(user._rooms).toHaveLength(1)
})

test('Getall data of room', async () => {
    class Room {
        $schema = {
            users: {
                name: String
            }
        }
    }
    const room =  World.addRoom('room', Room)
    
    /*await (new Promise((resolve, reject) => {
        
    }))*/

    socket.on('w', (packet) => {
        console.log(packet)
        //resolve()
    })

    socket.emit(':join', 'room')

    const user = room.users['$mock']
    const packet =  Transmitter.getPacket(room)
    
})