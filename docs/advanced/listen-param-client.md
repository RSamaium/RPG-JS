# Create your own display on the sprite

## Prerequisites

You have created a spritesheet, and display the character on the map

## Goal

The purpose of this tutorial is to understand how to listen to the player's parameters on the server side (such as HP, currency amount, etc.) and display the data on the sprite. We will display the character's name.

![name](/assets/name-hero.png)

## Creation of the module

First, we can create a module. Generate it with the following command

`npx rpgjs generate module display-name`

> Remember, the module is an independent feature of the game. By creating a module, you can add, remove or share a feature

Add the module then in <PathTo to="moduleIndex" />:

```ts
import main from './main'
import displayName from './display-name' 

export default [
    main,
    displayName
]
```

## Listen to parameter changes

The following applies in the sprite, go to <PathTo to="modDir" file="display-name/client/sprite.ts" />:

```ts
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
    }
    // Code not completed...
}
```

We use PIXI.js to display a text above the character.
To do this, in the `onInit` hook, when the sprite is displayed on the map, we add the text instance in `textGraphic` property

> Remember to declare in the interface this new property (as we do in the code above) so that Typescript can understand that this property is not unknown

Let's continue the code, but this time we'll listen to the name changes. So, if the server gives a name to the player, it will be applied directly to this sprite

```ts
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
```

We have added the onChanges hook. It is called as soon as a property is changed.

1. The condition verified that we had data and that the name has changed
2. We apply the name to the textGraphic property to display the name. We also try to center the name according to the size of the string

# Apply the name on the server side

It's up to you when and how you give the name. For example, as soon as the player arrives on the map, we can apply a name:

<PathTo to="playerFile" />:

```ts
import { RpgPlayer, RpgPlayerHooks } from '@rpgjs/server'

export const player: RpgPlayerHooks = {
    onJoinMap(player: RpgPlayer) {
        player.name = 'Hero'
    }
}
```