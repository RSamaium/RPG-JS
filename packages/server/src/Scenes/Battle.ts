import { RpgBattle } from '../Game/Battle/Battle'
import { BattleGui } from '../Gui/BattleGui'

export class SceneBattle {

    static readonly id: string = 'battle'

    private battles: Map<string, RpgBattle> = new Map()

    constructor(private server: any) { }

    create(player, ennemies, options: {}) {
        const battleId = ''+Math.random()
        const battle = new RpgBattle(this.server, battleId, ennemies, options)
        this.battles.set(battleId, battle)
        this.join(battleId, player)
        return this
    }

    join(battleId: string, player) {
        let battle: RpgBattle | undefined = this.battles.get(battleId)
        this.server.assignObjectToRoom(player, battleId)
        this.server.sendToPlayer(player, 'player.loadScene', {
            name: SceneBattle.id, 
            data: {}
        })
        if (battle) {
            const gui = new BattleGui(player, battle)
            player._gui[gui.id] = gui
            gui.open()
        }
    }
}