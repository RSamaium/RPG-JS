import { Howl } from 'howler'
import { sounds } from './Sounds'

export class RpgSound extends Howl {
    constructor(id: string) {
        const resource = sounds.get(id)
        super({
            src: [resource.sound],
            loop: resource.loop,
            autoplay: resource.autoplay,
            volume: resource.volume,
            sprite: resource.sprite
        })
    }
}