import { World } from '../src/world'
import { Transmitter } from '../src/transmitter'
import { EventEmitter } from '@rpgjs/common'
import { testSend } from './fixture'

beforeEach(() => {
    World.transport(new EventEmitter())
    Transmitter.encode = false
})

test('Test Room properties', () => {
    class Room { }
    const room =  World.addRoom('room', Room)
    expect(room.id).toBe('room')
    expect(room.$schema).toBeDefined()
    expect(room.$schema.users[0].id).toBeDefined()
})

test('Get All after enter in room', async () => {
    class Room { 
        $schema = {
            users: [
                { 
                    id: String,
                    name: String
                }
            ]
        }
    }
    const room =  World.addRoom('room', Room)
    await testSend(room)
    room.users['test'].private = 'key1'
    const value: any = await testSend(room, 'test2')
    room.users['test2'].private = 'key2'
    const users: any = Object.values(value[2].users)

    expect(users).toHaveLength(2)
    expect(users[0]).toHaveProperty('name')
    expect(users[0]).not.toHaveProperty('private')

    expect(users[1]).toHaveProperty('name')
    expect(users[1]).not.toHaveProperty('private')
})


test('Change properties', async () => {
    class Room { 
        $schema = {
            position: {
                x: Number,
                y: Number
            }
        }
        position = {
            x: 1,
            y: 2
        }
    }
    const room: any =  World.addRoom('room', Room)
    room.position.x = 5

    const value: any = await testSend(room)
    expect(value[2]).toMatchObject({ position: { x: 5 }})
})

test('change root propertie in room', async () => {
    class Room { 
        $schema = {
            position: {
                x: Number,
                y: Number
            }
        }
        position = {
            x: 1,
            y: 2
        }
    }
    const room: any =  World.addRoom('room', Room)
    room.position = { x: 5, y: 2 }
    const value: any  = await testSend(room)
    expect(value[2]).toMatchObject({ position: { x: 5 }})
})

test('Not listen properties', () => {
    class Room { 
        position = {
            x: 1,
            y: 2
        }
    }
    const room: any =  World.addRoom('room', Room)
    room.position.x = 5
    const packet =  Transmitter.getPackets(room)
    expect(packet).toBeUndefined()
})