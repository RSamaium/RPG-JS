## Trigger the GUI

You have either the client side solution or the server side solution. 

- Advantage on the client side: instantaneous, no communication with the server
- Disadvantage: the server does not have the authority and cannot trigger it for all players at once

On the server side, it's the opposite :)

### Client Side

1. you must open the menu, as usual (here, named `my-tooltip`)

```ts
RpgGui.display('my-tooltip')
```

You can open it whenever you want, for example, after loading a map

<div class="module-api">

```ts
import { RpgClient, RpgModule, RpgGui } from '@rpgjs/client'
import myTooltip from './gui/tooltip.vue'
import sprite from './sprite'

@RpgModule<RpgClient>({ 
    scenes: {
        map: {
            onAfterLoading() {
                RpgGui.display('my-tooltip')
            }
        }
    },
	sprite,
    gui: [
        myTooltip
    ]
})
export default class RpgClientModuleEngine {}
```

<PathTo to="baseModule" file="sprite.ts" />

```ts
import { RpgSprite, RpgSpriteHooks } from '@rpgjs/client'

export const sprite: RpgSpriteHooks = {
    onInit(sprite: RpgSprite) {
        sprite.interactive = true
        sprite.on('click', () => {
            sprite.guiDisplay = !sprite.guiDisplay
        })
    }
}
```

</div>

<div class="autoload-api">

<PathTo to="baseModule" file="scene-map.ts" />

```ts
import {RpgGui } from '@rpgjs/client'

export default {
	onAfterLoading() {
		RpgGui.display('my-tooltip')
	}
}
```

2. Then you can trigger the opening on the sprite

<PathTo to="baseModule" file="sprite.ts" />

```ts
import { RpgSprite, RpgSpriteHooks } from '@rpgjs/client'

export const sprite: RpgSpriteHooks = {
    onInit(sprite: RpgSprite) {
        sprite.interactive = true
        sprite.on('click', () => {
            sprite.guiDisplay = !sprite.guiDisplay
        })
    }
}
```

Clicking on the sprite opens (or closes) the tooltip

</div>


## Server Side

> Even if we are on the server side, remember to add the GUI in the client side module

<PathTo to="playerFile" />

```ts
import { RpgPlayer, RpgPlayerHooks } from '@rpgjs/server'
 
export const player: RpgPlayerHooks = {
    onJoinMap(player: RpgPlayer) {
        player.gui('my-tooltip').open()
        player.showAttachedGui()
		// you can hide with player.hideAttachedGui()
    }
}
```

We open the `my-tooltip` GUI and display the player's tooltip 

:::tip Tip 
You can indicate which tooltips you want to display by specifying the events (or players) in parameter: 

```ts
player.showAttachedGui([otherEvent, otherPlayer])
```
:::