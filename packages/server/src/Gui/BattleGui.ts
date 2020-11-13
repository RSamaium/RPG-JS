import { Gui } from './Gui'
import { RpgPlayer } from '../Player/Player'
import { IGui } from '../Interfaces/Gui'
import { RpgBattle } from '../Game/Battle/Battle'

export class BattleGui extends Gui implements IGui {
    constructor(player: RpgPlayer, private battle: RpgBattle) {
        super('rpg-battle', player)
    }

    open() {
        this.on('attack', ({ enemy: id }) => {
           const enemy = this.battle.getEnemy(id)
           const damage = enemy.applyDamage(this.player)
           this.player.emit('battle.damage', [
               { enemy: id, damage }
           ])
        })
        return super.open({}, {
            waitingAction: true,
            blockPlayerInput: true
        })
    }
}