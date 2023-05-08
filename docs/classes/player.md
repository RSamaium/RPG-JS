# RpgPlayer

An `RpgPlayer` instance is created each time a player is connected. In an event, you often find a `player` parameter of type `RpgPlayer`. You have a series of methods to apply to the player

```ts
import { RpgPlayer, RpgPlayerHooks } from '@rpgjs/server'

export const player: RpgPlayerHooks = {
    onConnected(player: RpgPlayer) {
        // Making instructions when the player is connected
    }
}
```

[Then put the class in the RpgServer decorator.](/classes/server.html#playerclass)

<!--@include: ../api/RpgPlayerHooks.md-->