import { RpgPlayer, RpgPlayerHooks, Control, Components, RpgEvent } from '@rpgjs/server'
import { Armor, Weapon } from '@rpgjs/database'

@Weapon({
    name: 'Sword',
    description: 'Attack 10'
})
class Sword {
    onAdd(player: RpgPlayer) {
    }

    onEquip(player: RpgPlayer, equip: boolean) {
    }

    onRemove(player: RpgPlayer) {
    }
}

@Armor({
    id: 'shield',
    name: 'Shield',
})
class Shield {
    onAdd(player: RpgPlayer) {
    }

    onEquip(player: RpgPlayer, equip: boolean) {
    }

    onRemove(player: RpgPlayer) {
    }
}

const player: RpgPlayerHooks = {
    onConnected(player: RpgPlayer) {
        player.name = 'YourName'
        player.setComponentsTop(Components.text('{name}'))

        player.gui('inventory').open();
    },
    onInput(player: RpgPlayer, { input }) {
        if (input == Control.Back) {
            player.callMainMenu()
        }

        if (input == Control.Action) {
            player.addItem(Sword);
        }
    },
    async onJoinMap(player: RpgPlayer) {
        player.addItem(Sword);
        player.addItem(Shield);
    }
}

export default player