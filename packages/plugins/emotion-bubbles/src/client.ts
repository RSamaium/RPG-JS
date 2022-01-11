import { RpgClient, RpgModule, RpgClientEngine } from '@rpgjs/client'
import { Emote } from './spritesheet/bubble'

@RpgModule<RpgClient>({ 
  engine: {
    onStart(engine: RpgClientEngine) {
      engine.addSpriteSheet(Emote(engine.globalConfig.emotionBubble))
    }
  }
})
export default class RpgClientModule {}