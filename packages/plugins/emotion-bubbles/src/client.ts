import { HookClient } from '@rpgjs/client'
import { Emote } from './spritesheet/bubble'

export default function({ RpgPlugin }, options) {
    RpgPlugin.on(HookClient.AddSpriteSheet, () => {
        return [
            Emote(options)
        ]
    })
}