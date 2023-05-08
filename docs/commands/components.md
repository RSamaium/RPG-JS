# Components

The aim is to add components around the graphic: a text, a life bar, etc. This way, the server always has authority over the display and all data is synchronised to all players in real time

Example of use:

![hpbar](/assets/hpbar.png)

```ts
import { RpgPlayer, RpgPlayerHooks, Components } from '@rpgjs/server'

export const player: RpgPlayerHooks = {
    onConnected(player: RpgPlayer) {
        player.name = 'Sam'
        player.setComponentsTop<any>([
            Components.text('{name}'),
            Components.hpBar()
        ])
    }
}
```

The `onConnected` hook takes a player object of type `RpgPlayer` as its argument. Inside the `onConnected` hook, the `setComponentsTop` method of the `player` object is called with an array of two `Components`:

`Components.text('{name}')`: This creates a text component that displays the name of the player. The {name} placeholder is replaced with the actual name of the player.

`Components.hpBar()`: This creates a health bar component that displays the current and maximum health of the player.

The `setComponentsTop `method is used to set the components that are displayed at the top of the player's screen. By setting the text and health bar components at the top, the player can easily see their name and health status while playing the game.

## Player API

<!--@include: ../api/ComponentManager.md-->

## Built-in Components

<!--@include: ../api/Components.md-->