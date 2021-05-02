import { HookClient, RpgSprite } from '@rpgjs/client'

export default function({ RpgPlugin }) {
    const bar = new PIXI.Graphics()
    RpgPlugin.on(HookClient.AddSprite, (sprite: RpgSprite) => {
        const data = sprite['data']
        const bar = (width, opacity) => {
            const graphic = new PIXI.Graphics()
            graphic.lineStyle(1, 0x000000)
            graphic.beginFill(0xDE3249, opacity)
            graphic.drawRect(0, 0, width, 5)
            graphic.endFill()
            return graphic
        }
        const fullWidth = 32

        const fullBar = bar(fullWidth, 0)
        fullBar.y = -25
        fullBar.alpha = 0.5

        const width = (data.hp * fullWidth) / data.param.maxHp

        const innerBar = bar(width, 1)

        const graphic = new PIXI.Graphics()
        graphic.beginFill(0xDE3249)
        graphic.drawRect(0, 0, data.hitbox.w, data.hitbox.h)
        graphic.endFill()

        sprite.addChild(graphic)
        fullBar.addChild(innerBar)
        sprite.addChild(fullBar)
    })
}