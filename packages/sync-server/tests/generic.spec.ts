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
    }

    room = World.addRoom('room', Room)
})

test('Test Generic Key 1',  () => {
    return new Promise(async (resolve) => {
        room.list = {}
        await testSend(room)

        const user = room.users['test']

        room.list.mykey = {
            public: 'p',
            secret: 's'
        }
        
        user._socket.emit = (ev, value) => {
            expect(value[2]).toMatchObject({ list: { mykey: { public: 'p' } } })
            resolve()
        }

        World.send()
   })
})

test('Test Generic Key 2',  () => {
    return new Promise(async (resolve) => {
        await testSend(room)

        const user = room.users['test']

        room.list = { 
            mykey: {
                public: 'p',
                secret: 's'
            }
        }
        
        user._socket.emit = (ev, value) => {
            expect(value[2]).toMatchObject({ list: { mykey: { public: 'p' } } })
            resolve()
        }

        World.send()
   })
})

test('Test Generic Key with array',  () => {
    return new Promise(async (resolve) => {

        class Room {
            $schema = {
                list: [{
                    nb: [String]
                }]
            }

            list = {}
        }
    
        room = World.addRoom('room', Room)

        room.list.mykey = {
            nb: []
        }

        await testSend(room)

        const user = room.users['test']

        room.list.mykey.nb.push('hello')
        
        user._socket.emit = (ev, value) => {
            expect(value[2]).toMatchObject({ list: { mykey: { nb: { '0': 'hello' } } } })
            expect(value[2].list.mykey.nb.length).toBeUndefined()
            resolve()
        }

        World.send()
   })
})