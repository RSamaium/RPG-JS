import { RpgSpriteHooks, RpgSprite } from '@rpgjs/client'

export const sprite: RpgSpriteHooks = {
   onMove(sprite: RpgSprite) {
     console.log(sprite.logic.tilesCollision)
   }
} 