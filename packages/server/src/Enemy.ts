import { RpgPlayer } from './Player/Player'

export default class RpgEnemy extends RpgPlayer  {
    public readonly type: string = 'enemy'
    options: any
    gain: any

    constructor(...args) {
        super(...args)
        const { 
            parameters = {}, 
            startingEquipment = [], 
            startingItems = [],
            gain, 
            graphic,
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
        this.graphic = graphic
    }
}