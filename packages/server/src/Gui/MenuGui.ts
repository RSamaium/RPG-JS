import { Gui } from './Gui'
import RpgPlayer from '../Player'
import { IGui } from '../Interfaces/Gui'

export class MenuGui extends Gui implements IGui {
    constructor(player: RpgPlayer) {
        super('rpg-main-menu', player)
    }

    open() {
        return super.open('', {
            waitingAction: true,
            blockPlayerInput: true
        })
    }
}