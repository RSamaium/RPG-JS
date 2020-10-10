import Player from './Player'

export default class RpgEnemy extends Player  {
    public readonly type: string = 'enemy'
    options: any
    gain: any

    constructor() {
        super()
        const { 
            parameters = {}, 
            startingEquipment = [], 
            startingItems = [],
            gain, 
            statesEfficiency = [], 
            elementsEfficiency = []
        } = this.options
        for (let param in parameters) {
            this.addParameter(param, parameters[param])
        }
        for (let item of startingEquipment) {
            this.addItem(item)
            this.equip(item, true)
        }
        for (let { nb, item } of startingItems) {
            this.addItem(item, nb)
        }
        this.statesEfficiency = statesEfficiency
        this.elementsEfficiency = elementsEfficiency
        this.gain = gain
    }
}