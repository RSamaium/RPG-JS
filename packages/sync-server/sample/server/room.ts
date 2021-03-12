import { Input } from '../../src'
import { Player } from './player'
import { Schema } from '../../src/decorators/schema';

@Schema({
    users: [Player.schema],
    title: Number
})
export class Page {

    title: number = 1
    
    onJoin(user: Player) {
      user.name = 'sam' 
    }
}