import RpgPlayer from '../../Player'

export class RpgBattle {

    turnIndex: number = 0

    constructor(private server: any, private battleId: string, enemies: any[], private options = {}) {
        this.createEnnemies(enemies)
    }

    get players() {
        return this.server.gameEngine.world.getObjectsOfGroup(this.battleId)
    }

    get game() {
        return this.server.gameEngine
    }

    getEnemy(id) {
        return this.server.gameEngine.world.getObject(id)
    }

    private createEnnemies(enemies: any[]): void {
        for (let ennemyObj of enemies) {
            const enemy = this.game.addEvent(ennemyObj.enemy)
            enemy.server = this.server
            enemy.level = ennemyObj.level
            this.server.assignObjectToRoom(enemy, this.battleId)
        }
    }
}