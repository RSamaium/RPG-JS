import { RpgPlayer } from '../../Player/Player'

export class RpgBattle {

    turnIndex: number = 0

    constructor(private server: any, private battleId: string, enemies: any[], private options = {}) {
        this.createEnnemies(enemies)
    }

    get game() {
        return this.server.gameEngine
    }

    get world() {
        return this.game.world
    }

    get players() {
        return this.world.getObjectsOfGroup(this.battleId)
    }

    getEnemy(id) {
        return this.world.getObject(id)
    }

    private createEnnemies(enemies: any[]): void {
        for (let ennemyObj of enemies) {
            const enemy = this.game.addEvent(ennemyObj.enemy)
            enemy.server = this.server
            enemy.level = ennemyObj.level
            enemy.onDead = () => {
                this.world.removeObject(enemy.id)
            }
            this.server.assignObjectToRoom(enemy, this.battleId) 
        }
    }
}