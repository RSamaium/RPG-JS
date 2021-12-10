import { World } from '../src/world'

const USER_ID = 'test'

export function testSend(room) {
    return new Promise((resolve) => {
         World.connectUser({
             emit(event, value) {
                 // avoid first emit
                 if (value != USER_ID) resolve(value)
             }
         }, USER_ID)
         World.joinRoom(room.id, 'test')
         World.send()
    })
 }