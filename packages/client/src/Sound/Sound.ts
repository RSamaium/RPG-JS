interface SoundOptions  {
    sounds?: {
        [id: string]: string
    }
    id?: string
    sound?: string
    loop?: boolean,
    volume?: number
}

export function frameTo() {

}

export function Sound(options: SoundOptions) {
    return (target) => {
        target.sounds = options.sounds
        target.id = options.id
        for (let key in options) {
            target.prototype[key] = options[key]
        }
    }
}