export class GoldManager {
    private _gold = 0

    set gold(val) {
        if (val < 0) {
            val = 0
        }
        this._gold = val
        this.paramsChanged.add('gold')
    }

    get gold() {
        return this._gold
    }
}

export interface GoldManager {
    paramsChanged: Set<string>
}