import { World } from '../src/world'
import { Transmitter } from '../src/transmitter'
import { EventEmitter } from '@rpgjs/common'

beforeEach(() => {
    World.transport(new EventEmitter())
    Transmitter.clear()
})

test('Test Room properties', () => {
    class Room { }
    const room =  World.addRoom('room', Room)
    expect(room.id).toBe('room')
    expect(room.$schema).toBeDefined()
    expect(room.$schema.users[0].id).toBeDefined()
})

test('Change properties', () => {
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
    const room =  World.addRoom('room', Room)
    room.position.x = 5
    const packet =  Transmitter.getPacket(room)
    expect(packet.data).toMatchObject({ position: { x: 5 }})
})

test('change root propertie in room', () => {
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
    const room =  World.addRoom('room', Room)
    room.position = { x: 5, y: 2 }
    const packet =  Transmitter.getPacket(room)
    expect(packet.data).toMatchObject({ position: { x: 5 }})
})

test('Not listen properties', () => {
    class Room { 
        position = {
            x: 1,
            y: 2
        }
    }
    const room =  World.addRoom('room', Room)
    room.position.x = 5
    const packet =  Transmitter.getPacket(room)
    expect(packet).toBeUndefined()
})