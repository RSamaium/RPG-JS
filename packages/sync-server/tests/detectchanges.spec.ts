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
            list: [{
                public: String
            }]
        }
        list = []
    }

    room = World.addRoom('room', Room)
})

test('Test Array properties 1', async () => {
    room.list[0] =  {
        public: 'p',
        secret: 's'
    }
    const value  = await testSend(room)
    expect(value[1]).toMatchObject({ list: { '0': { public: 'p' } }})
})

test('Test Array properties 2', async () => {
    room.list =  [{
        public: 'p',
        secret: 's'
    }]
    const value  = await testSend(room)
    expect(value[1]).toMatchObject({ list: { '0': { public: 'p' } }})
})

test('Test Array properties 3', async () => {
    room.list.push({
        public: 'p',
        secret: 's'
    })
    const value  = await testSend(room)
    expect(value[1]).toMatchObject({ list: { '0': { public: 'p' } }})
})

test('Test Array properties and next change', () => {
   return new Promise(async (resolve) => {
        room.list.push({
            public: 'p',
            secret: 's'
        })
        
        const value  = await testSend(room)
        const user = room.users['test']

        expect(value[1]).toMatchObject({ list: { '0': { public: 'p' } }})
        room.list[0].public = 'change'
        
        user._socket.emit = (ev, value) => {
            expect(value[1]).toMatchObject({ list: { '0': { public: 'change' } }})
            resolve()
        }
        World.send()
   })
})