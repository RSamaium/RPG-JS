# RpgSprite

Each time an event or player appears on the map, an `RpgSprite` is called. It contains the graphics of the player but also a container to put tiles of the map on top of the sprite (for overlay). Don't pay attention to this system, it is part of the RpgJS engine.

However, `RpgSprite` inherits from [PIXI.Sprite](https://pixijs.download/dev/docs/PIXI.Sprite.html). This way, you can add other containers, etc. This way, you can add other containers, etc.

[Put the created class in the RpgClient decorator](/classes/client.html#rpgclient-decorator)

## Hooks

```ts
import { RpgSprite, RpgSpriteHooks } from '@rpgjs/client'

const sprite: RpgSpriteHooks = {
    onInit(sprite: RpgSprite) {

    }
}
```

<!--@include: ../api/RpgSpriteHooks.md-->

## RpgSprite

<!--@include: ../api/RpgSprite.md-->

## RpgSpriteLogic

<!--@include: ../api/RpgSpriteLogic.md-->

