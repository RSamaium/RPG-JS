import { RpgClient, RpgModule } from '@rpgjs/client'
import { Emote } from './spritesheet/bubble'

@RpgModule<RpgClient>({ 
  spritesheets: [
    Emote()
  ]
})
export default class RpgClientModule {}