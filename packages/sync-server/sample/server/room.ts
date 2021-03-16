import { Input } from '../../src'
import { Player } from './player'
import { Schema } from '../../src/decorators/schema';

@Schema({
    users: [Player.schema],
    title: String
})
export class Page {

    title: string = 'test'
    
    onJoin(user: Player) {
      user.name = 'sam' 
    }

    filterEmit(user: Player, packet) {
      const data = packet.data
      return packet.clone({ })
    }
}