import { Spritesheet, Presets } from '@rpgjs/client'

const { RMSpritesheet } = Presets

@Spritesheet({
    width: 96,
    height: 128,
    ...RMSpritesheet(3, 4)
})
export default class Characters { }