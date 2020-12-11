import { Input } from '../../src'
import { Player } from './player'
import { Schema } from '../../src/decorators/schema';

@Schema({
    users: [Player.schema]
})
export class Page {
    @Input() title = ''

    onJoin(user: Player) {
        setTimeout(() => {
            user.name = 'toto'
        }, 1000)
    }
}