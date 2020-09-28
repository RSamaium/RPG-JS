import { Gui } from './Gui'
import RpgPlayer from '../Player'

export class DialogGui extends Gui {
    constructor(player: RpgPlayer) {
        super('rpg-dialog', player)
    }

    open(message: string, options: any) {
        if (!options.choices) options.choices = []
        if (options.autoClose == undefined) options.autoClose = false
        if (!options.position) options.position = 'bottom'
        if (options.fullWidth == undefined) options.fullWidth = true
        if (options.typewriterEffect  == undefined) options.typewriterEffect = true
        const data = {
            ...options,
            // remove value property. It is not useful to know this on the client side.
            choices: options.choices.map(choice => ({
                text: choice.text
            }))
        }
        return super.open({
            message,
            ...data
        }, {
            waitingAction: true,
            blockPlayerInput: true
        })
    }
}