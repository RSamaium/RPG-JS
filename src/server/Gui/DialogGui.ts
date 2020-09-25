import { Gui } from './Gui'
import RpgPlayer from '../Player'

export class DialogGui extends Gui {
    constructor(player: RpgPlayer) {
        super('rpg-dialog', player)
    }

    open(message: string, choices: any = []) {
        return super.open({
            message,
            // remove value property. It is not useful to know this on the client side.
            choices: choices.map(choice => ({
                text: choice.text
            }))
        }, {
            waitingAction: true,
            blockPlayerInput: true
        })
    }
}