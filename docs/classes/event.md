# RpgEvent

## @EventData decorator

<!--@include: ../api/EventData.md-->

## RpgEvent Hooks

An event has hooks that will be called according to the life cycle of the event.

Full example: 

```ts
import { RpgEvent, EventData, RpgPlayer } from '@rpgjs/server'

@EventData({
    name: 'EV-1'
})
export class CharaEvent extends RpgEvent {
    onInit() { }

    onChanges(player: RpgPlayer)

    onAction(player: RpgPlayer) { }

    onPlayerTouch(player: RpgPlayer) { }
}
```

::: tip Info
Note that `RpgEvent` inherits from `RpgPlayer`, you can use all of the player's commands
:::

### onInit()

As soon as the event is created, this method is called

### onChanges()

this method is called as soon as any event on the map (including itself) is executed

```ts
import { RpgEvent, EventData, RpgPlayer } from '@rpgjs/server'

@EventData({
    name: 'EV-1'
})
export class CharaEvent extends RpgEvent {
    onChanges(player: RpgPlayer) {
        if (player.getVariable('BATTLE_END')) {
            this.graphic('chest-open')
        }
        else {
            this.graphic('chest-close')
        }
    }
}
```

Above, as soon as the variable `BATTLE_END` is set to `true` (and this change is made by another event), then the graph of the event will change automatically

### onAction()

If the event collides with the player and the player presses the action key, the method is called

### onPlayerTouch()

If the event collides with the player, the method is called

## RpgEvent methods

<!--@include: ../api/RpgEvent.md-->