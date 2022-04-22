import { World } from '../src/world'

const USER_ID = 'test'

export function testSend(room, userId = USER_ID) {
    return new Promise((resolve) => {
         World.connectUser({
             emit(event, value) {
                 // avoid first emit
                 if (value != userId) resolve(value)
             }
         }, userId)
         World.joinRoom(room.id, userId)
         World.send()
    })
 }