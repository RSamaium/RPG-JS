import { PrebuiltGui } from '@rpgjs/common'
import { Gui } from './Gui'
import { RpgPlayer } from '../Player/Player'
import { IGui } from '../Interfaces/Gui'

export class MenuGui extends Gui implements IGui {
    constructor(player: RpgPlayer) {
        super(PrebuiltGui.MainMenu, player)
    }

    open() {
        this.on('useItem', (id) => {
            try {
                this.player.useItem(id)
                this.player.syncChanges()
            }
            catch (err: any) {
                this.player.showNotification(err.msg)
            }
        })
        return super.open('', {
            waitingAction: true,
            blockPlayerInput: true
        })
    }
}