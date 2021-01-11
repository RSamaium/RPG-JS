import { PrebuiltGui } from '@rpgjs/common'
import { Gui } from './Gui'
import { RpgPlayer } from '../Player/Player'
import { IGui } from '../Interfaces/Gui'

export class ShopGui extends Gui implements IGui {
    constructor(player: RpgPlayer) {
        super(PrebuiltGui.Shop, player)
    }

    open(items: any[]) {
        items = items.map(item => {
            const it = new item()
            return {
                price: it.price,
                name: it.name,
                description: it.description,
                id: it.id,
                type: item.type
            }
        })
        this.on('buyItem', ({ id, nb }) => {
            try {
                this.player.buyItem(id, nb)
            }
            catch (err) {
                console.log(err)
            }
        })
        this.on('sellItem', ({ id, nb }) => {
            try {
                this.player.sellItem(id, nb)
            }
            catch (err) {
                console.log(err)
            }
        })
        return super.open({ items }, {
            waitingAction: true,
            blockPlayerInput: true
        })
    }
}