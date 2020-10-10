import Player from './Player'

export default class RpgEnemy extends Player  {
    public readonly type: string = 'enemy'
    options: any
    gain: any

    constructor() {
        super()
        const { parameters, equipments, gain }= this.options
        for (let param in parameters) {
            this.addParameter(param, parameters[param])
        }
        for (let item of equipments) {
            this.addItem(item)
            this.equip(item, true)
        }
        this.gain = gain
    }
}