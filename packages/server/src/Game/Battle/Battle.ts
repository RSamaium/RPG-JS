import RpgPlayer from '../../Player'

export class RpgBattle {

    private enemies: any[] = []

    constructor(private server: any, private battleId: string, enemies: any[], private options = {}) {
        this.createEnnemies(enemies)
    }

    get players() {
        return this.server.gameEngine.world.getObjectsOfGroup(this.battleId)
    }

    private createEnnemies(enemies: any[]): void {
        for (let ennemyObj of enemies) {
            const enemyData = new ennemyObj.enemy()
            const enemy = new RpgPlayer()
            enemy.level = ennemyObj.level
            this.enemies.push(enemy)
        }
    }
}