import { Howl, Howler } from 'howler'
import { log } from '../Logger'
import { sounds } from './Sounds'

class RpgSoundClass {
    get(id: string): Howl {
        const resource = sounds.get(id)
        if (!resource) {
            throw log(`Impossible to find the ${id} sound. Did you put the right name or create the sound?`)
        }
        return new Howl({
            src: [resource.sound],
            loop: resource.loop,
            autoplay: resource.autoplay,
            volume: resource.volume,
            sprite: resource.sprite
        })
    }
    get global(): typeof Howler {
        return Howler
    }
}

export const RpgSound = new RpgSoundClass()