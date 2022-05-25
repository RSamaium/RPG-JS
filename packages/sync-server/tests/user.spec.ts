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
    expect(user?._rooms).toHaveLength(0)
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
    return new Promise((resolve: any) => {
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

        socket.on('w', ([ev, time, value]) => {
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

test('Change Schema', () => {
    return new Promise((resolve: any) => {
        let send = 0
        class Room {
            $schema = {
                count: Number
            }
            countAsync = 0
            count = 0
        }

        socket.on('w', ([ev, time, value]) => {
            send++
            switch (send) {
                case 1:
                    expect(value.count).toBe(0)
                    break;
                case 3:
                    expect(value.countAsync).toEqual(1)
                    resolve()
                    break;
            }
        })

        let room =  World.addRoom('room', Room) 
        socket.emit(':join', 'room')
        World.send()
        room = room.$setSchema({
            count: Number,
            countAsync: Number
        })
        room.countAsync++
        World.send()
    })
})

test('Change Room', () => {
    return new Promise((resolve: any) => {
        let send = 0
        
        class Room {
            $schema = {
                users: [{
                    position: {
                        x: Number,
                        y: Number
                    }
                }]
            }
        }

        socket.on('w', ([room, time, value]) => {
            send++
            const user = value.users[CLIENT_ID]
            switch (send) {
                case 2:
                    expect(room).toBe('room1')
                    expect(user).toMatchObject({ position: {x: 10, y: 10} })
                    break;
                case 4:
                    expect(room).toBe('room2')
                    expect(user).toMatchObject({ position: {x: 20, y: 20} })
                    resolve()
                    break;
            }
        })

        let user
        let room1 =  World.addRoom('room1', Room) 
        World.joinRoom(room1.id, CLIENT_ID)
        user = World.getUser(CLIENT_ID)
        user.position = {x: 10, y: 10}
        World.send()

        World.leaveRoom(room1.id, CLIENT_ID)

        let room2 =  World.addRoom('room2', Room) 
        World.joinRoom(room2.id, CLIENT_ID)
        user = World.getUser(CLIENT_ID)
        user.position.x = 20
        user.position.y = 20
        World.send()
    })
})