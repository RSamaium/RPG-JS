export class GoldManager {
    private _gold: number = 0

     /** 
     * You can change the game money
     * 
     * ```ts
     * player.gold += 100
     * ```
     * 
     * @title Change Gold
     * @prop {number} player.gold
     * @default 0
     * @memberof GoldManager
     * */
    set gold(val: number) {
        if (val < 0) {
            val = 0
        }
        this._gold = val
    }

    get gold(): number {
        return this._gold
    }
}