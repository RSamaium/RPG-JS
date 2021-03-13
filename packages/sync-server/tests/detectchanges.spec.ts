import { World } from '../src/world'
import { Transmitter } from '../src/transmitter'
import { testSend } from './fixture'
import { EventEmitter } from '@rpgjs/common'

beforeEach(() => {
    World.transport(new EventEmitter())
    Transmitter.encode = false
})

test('Test Array properties', async () => {
    class Room {
        $schema = {
            list: [{
                public: String
            }]
        }
        list = []
    }

    const room: any =  World.addRoom('room', Room)
    room.list.push({
        public: 'p',
        secret: 's'
    })

    const value  = await testSend(room)
    expect(value[1]).toMatchObject({ list: { '$0': { public: 'p' } }})
})