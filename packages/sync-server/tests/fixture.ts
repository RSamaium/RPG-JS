import { World } from '../src/world'

export function testSend(room) {
    return new Promise((resolve) => {
         World.connectUser({
             emit(event, value) {
                 resolve(value)
             }
         }, 'test')
         World.joinRoom(room.id, 'test')
         World.send()
    })
 }