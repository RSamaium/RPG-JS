interface SoundOptions  {
     /** 
     * Put the different sounds that are concerned by the properties below.
     * The key of the object is the identifier of the sound and the value and the link to the sound.
     * 
     * > Remember to wrap the link to the sound with the `require` function.
     * 
     * ```ts
     * sounds: {
     *    hero: require('./assets/sound.ogg')
     * }
     * ```
     * 
     * @prop { { [id: string]: string } } [sounds]
     * @memberof Sound
     * */
    sounds?: {
        [id: string]: string
    }

    /** 
     * Sound identifier.
     * 
     * > Do not use the `sounds` property
     * 
     * @prop {string} [id]
     * @memberof Sound
     * */
    id?: string

    /** 
     * The link to the sound
     * 
     * > Do not use the `images` property
     * > Remember to wrap the link to the image with the `require` function.
     * 
     * ```ts
     * sound: require('./assets/sound.ogg')
     * ```
     * 
     * @prop {string} [sound]
     * @memberof Sound
     * */
    sound?: string

    /** 
     * The sound will restart at the beginning when it is finished.
     * 
     * @prop {boolean} [loop]
     * @memberof Sound
     * */
    loop?: boolean,

    /** 
     * Volume
     * 
     * @prop {number} [volume]
     * @memberof Sound
     * */
    volume?: number
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