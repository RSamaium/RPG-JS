import { Gui } from './Gui'
import RpgPlayer from '../Player'

export class DialogGui extends Gui {
    constructor(player: RpgPlayer) {
        super('window', player)
    }

    open(message: string) {
        return super.open({
            message
        }, true)
    }
}