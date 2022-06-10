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
            keys: {
                a: {
                    public: {
                        $default: 15,
                        $syncWithClient: true,
                        $permanent: true
                    }
                },
                b: {
                    private: {
                        $syncWithClient: false,
                        $permanent: true
                    },
                    tmp: {
                        $syncWithClient: false,
                        $permanent: false
                    }
                }
            }
        }
        keys = {}
    }

    room = World.addRoom('room', Room)
})

/*
TODO
test('Test default value', async () => {
    const value: any = await testSend(room)
    expect(value[2].keys).toMatchObject({ a: { public: 15 }})
})
*/

test('Test with extra properties', async () => {
    room.keys = {
        a: {
            public: 5
        },
        b: {
            private: 'secret',
            tmp: 'trash'
        }
    }
    const value: any = await testSend(room)
    expect(value[2].keys).toMatchObject({ a: { public: 5 }})
})

test('Change with extra properties', async () => {
    room.keys = {
        a: {
            public: 5
        },
        b: {
            private: 'secret',
            tmp: 'trash'
        }
    }
    await testSend(room)
    room.keys.a.public = 10
    room.keys.b = {
        private: 'other'
    }
    const value: any = await testSend(room)
    expect(value[2].keys).toMatchObject({ a: { public: 10 }})
})

describe('Snapshot', () => {
    beforeEach(() => {
        class Room {
            $schema = {
                users: [{
                    id: true,
                    name: true,
                    secret: {
                        $syncWithClient: false
                    },
                    items: [
                        {
                            info: {
                                $syncWithClient: false
                            }
                        }
                    ]
                }]
            }
        }
        room = World.addRoom('room', Room)

    })
    
    test('Snapshot Room', async () => {
        await testSend(room)
        const user = room.users['test']
        user.name = 'frank'
        user.secret = 'aaa'
        user.items = []
        user.items.push({
            info: 'bbb'
        })
        const snapshot = room.$snapshot()
        const userObject = snapshot.users.test
        expect(userObject).toBeDefined()
        expect(userObject.secret).toBe('aaa')
        expect(userObject.items[0]).toHaveProperty('info', 'bbb')
    })

    test('Snapshot User in Room', async () => {
        await testSend(room)
        const user = room.users['test']
        user.name = 'frank'
        user.secret = 'aaa'
        user.items = []
        user.items.push({
            info: 'bbb'
        })
        const snapshot = room.$snapshotUser('test')
        expect(snapshot.name).toBe('frank')
        expect(snapshot.secret).toBe('aaa')
        expect(snapshot.items[0]).toHaveProperty('info', 'bbb')
    })
})