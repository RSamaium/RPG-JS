import Player from './Player'

export default class RpgEvent extends Player  {

    public readonly type: string = 'event'

    setGraphic(graphic) {
        super.setGraphic(graphic)
        this.paramsChanged.add('graphic')
    }
}