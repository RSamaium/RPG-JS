import { Gui } from './Gui'
import RpgPlayer from '../Player'
import { IGui } from '../Interfaces/Gui'

export class BattleGui extends Gui implements IGui {
    constructor(player: RpgPlayer) {
        super('rpg-battle', player)
    }

    open() {
        /*this.on('useItem', (id) => {
            try {
                this.player.useItem(id)
                this.player.syncChanges()
            }
            catch (err) {
                console.log(err)
            }
        })*/
        return super.open({}, {
            waitingAction: true,
            blockPlayerInput: true
        })
    }
}