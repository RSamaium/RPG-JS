import { RpgSprite, RpgSpriteHooks, RpgSpriteLogic } from '@rpgjs/client'

declare module '@rpgjs/client' {
    export interface RpgSprite {
        textGraphic: PIXI.Text
    }
}

export const sprite: RpgSpriteHooks = {
    
}