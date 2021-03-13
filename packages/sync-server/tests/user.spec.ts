import { World } from '../src/world'
import { Transmitter } from '../src/transmitter'
import { EventEmitter } from '@rpgjs/common'
import { testSend } from './fixture'

let event, socket

const CLIENT_ID = 'mock'

class SocketMock extends EventEmitter {
    client = {
        id: CLIENT_ID.replace('$$', '')
    }
}

beforeEach(() => {
    event = new EventEmitter()
    World.transport(event)
    socket = new SocketMock()
    event.emit('connection', socket)
    Transmitter.encode = false
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

test('Getall data of room', () => {
    return new Promise((resolve) => {
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

        socket.on('w', ([ev, value]) => {
            const user = room.users[CLIENT_ID]
            expect(user.id).toBe(CLIENT_ID)
            expect(value).toMatchObject({ users: { [CLIENT_ID]: { name: 'test' } } })
            resolve()
        })

        const room =  World.addRoom('room', Room) 
        socket.emit(':join', 'room')

        World.send()
    })
})