import RpgPlayer from '../../Player'

export class RpgBattle {

    private enemies: any[] = []

    constructor(private server: any, private battleId: string, enemies: any[], private options = {}) {
        this.createEnnemies(enemies)
    }

    get players() {
        return this.server.gameEngine.world.getObjectsOfGroup(this.battleId)
    }

    get game() {
        return this.server.gameEngine
    }

    private createEnnemies(enemies: any[]): void {
        for (let ennemyObj of enemies) {
            const enemy = this.game.addEvent(ennemyObj.enemy)
            enemy.level = ennemyObj.level
            this.server.assignObjectToRoom(enemy, this.battleId)
            this.enemies.push(enemy)
        }
    }
}