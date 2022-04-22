import { Howl, Howler } from 'howler'
import { log } from '../Logger'
import { sounds } from './Sounds'

class RpgSoundClass {
    private sounds: Map<string, Howl> = new Map()

    get(id: string): Howl {
        if (this.sounds.has(id)) {
            return this.sounds.get(id) as Howl
        }
        const resource = sounds.get(id)
        if (!resource) {
            throw log(`Impossible to find the ${id} sound. Did you put the right name or create the sound?`)
        }
        const howl = new Howl({
            src: [resource.sound],
            loop: resource.loop,
            autoplay: resource.autoplay,
            volume: resource.volume,
            sprite: resource.sprite
        })
        this.sounds.set(id, howl)
        return howl
    }

    stop(id: string) {
        this.get(id).stop()
    }

    play(id: string): boolean {
        const sound = this.get(id)
        if (!sound.playing()) {
            sound.play()
            return true
        }
        return false
    }

    clear() {
        this.sounds.clear()
        this.global.stop()
    }

    get global(): typeof Howler {
        return Howler
    }
}

export const RpgSound = new RpgSoundClass()