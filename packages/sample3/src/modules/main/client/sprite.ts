import { RpgSprite, RpgSpriteHooks } from '@rpgjs/client'

declare module '@rpgjs/client' {
    export interface RpgSprite {
        textGraphic: PIXI.Text
    }
}

export const sprite: RpgSpriteHooks = {
    onInit(sprite: RpgSprite) {
        const style = new PIXI.TextStyle({
            fontSize: 14,
            fontWeight: 'bold'
        })
        const textGraphic = new PIXI.Text('', style)
        textGraphic.y = -25
        textGraphic.anchor.set(0.5)
        sprite.textGraphic = textGraphic
        sprite.addChild(textGraphic)
    },
    onChanges(sprite: RpgSprite, data: any) {
        if (data && data.name) {
            const name = data.name
            // To center the text...
            sprite.textGraphic.x = name.length + 12
            sprite.textGraphic.text = name
        }
    }
}