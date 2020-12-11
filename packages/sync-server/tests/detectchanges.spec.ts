import { World } from '../src/world'
import { Transmitter } from '../src/transmitter'
import { EventEmitter } from '@rpgjs/common'

beforeEach(() => {
    World.transport(new EventEmitter())
    Transmitter.clear()
})

test('Test Array properties', () => {
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

    room.$detectChanges()

    const packet =  Transmitter.getPackets(room)
    expect(packet[0].body).toMatchObject({ list: { '0': { public: 'p' } }})
})