import { RpgPlayer } from './Player/Player'

export default class RpgEvent extends RpgPlayer  {

    public readonly type: string = 'event'

    setGraphic(graphic) {
        super.setGraphic(graphic)
        this.paramsChanged.add('graphic')
    }
}