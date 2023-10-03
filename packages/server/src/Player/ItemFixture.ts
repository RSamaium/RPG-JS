import { ItemInstance } from "@rpgjs/database"

export class ItemFixture {
    protected getFeature(name, prop): any {
        const array = {}
        for (let item of this.equipments) {
            if (item[name]) {
                for (let feature of item[name]) {
                    const { rate } = feature
                    const instance = feature[prop]
                    const cache = array[instance.id]
                    if (cache && cache.rate >= rate) continue
                    array[instance.id] = feature
                }
            }
        }
        return Object.values(array)
    }
}


export interface ItemFixture{ 
    equipments: ItemInstance[]
}
