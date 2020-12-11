import { World } from '../src/world'
import { Transmitter } from '../src/transmitter'
import { EventEmitter } from '@rpgjs/common'

let event, socket

const CLIENT_ID = 'mock'

class SocketMock extends EventEmitter {
    client = {
        id: CLIENT_ID
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
    const user = World.getUser(CLIENT_ID)
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
    const user = room.users[CLIENT_ID]
    expect(user).toBeDefined()
    expect(user._socket).toBeDefined()
    expect(user._rooms).toHaveLength(1)
})

test('Getall data of room', async () => {
    class Room {
        $schema = {
            users: [{
                name: String
            }]
        }

        onJoin(user) {
            user.name = 'test'
        }
    }
    const room =  World.addRoom('room', Room)
    
    socket.emit(':join', 'room')

    const user = room.users[CLIENT_ID]
    const [packet] =  Transmitter.getPackets(room)

    expect(user.id).toBe(CLIENT_ID)
    expect(packet.body).toMatchObject({ users: { [CLIENT_ID]: { name: 'test' } } })
})