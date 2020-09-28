import { RpgBattle } from '../Game/Battle'

export class SceneBattle {

    static readonly id: string = 'battle'

    private battles: Map<string, RpgBattle> = new Map()

    constructor(private server: any) { }

    create(player, options: {}) {
        const battleId = ''+Math.random()
        const battle = new RpgBattle(this.server, options)
        this.battles.set(battleId, battle)
        this.join(battleId, player)
    }

    join(battleId: string, player) {
        let battle: RpgBattle | undefined = this.battles.get(battleId)
        this.server.assignObjectToRoom(player, battleId)
        this.server.sendToPlayer(player, 'player.loadScene', {
            name: SceneBattle.id, 
            data: {}
        })
    }
}