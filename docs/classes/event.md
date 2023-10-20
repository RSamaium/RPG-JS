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

    onInShape(shape: RpgShape) {}

    onOutShape(shape: RpgShape) {}

    onDetectInShape(player: RpgPlayer, shape: RpgShape) {}

    onDetectOutShape(player: RpgPlayer, shape: RpgShape) {}
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

### onInShape()

If the event fits into a shape

Example: 

```ts
import { RpgEvent, EventData, RpgPlayer, ShapePositioning } from '@rpgjs/server'

@EventData({
    name: 'EV-1'
})
export class CharaEvent extends RpgEvent {
    onInShape(shape: RpgShape) {
        console.log(shape.id)
    }
}
```

### onOutShape()

If the event leaves a shape

Example: 

```ts
import { RpgEvent, EventData, RpgPlayer, ShapePositioning } from '@rpgjs/server'

@EventData({
    name: 'EV-1'
})
export class CharaEvent extends RpgEvent {
    onOutShape(shape: RpgShape) {
        console.log(shape.id)
    }
}
```

### OnDetect

`since v4.1.0`

If a player or another event enters the shape attached to the event, it triggers the hook.

Example: 

```ts
import { RpgEvent, EventData, RpgPlayer, ShapePositioning } from '@rpgjs/server'

@EventData({
    name: 'EV-1'
})
export class CharaEvent extends RpgEvent {
    onInit() {
         this.attachShape({
            height: 100,
            width: 100,
            positioning: ShapePositioning.Center
        })
    }
    onDetectInShape(player: RpgPlayer, shape: RpgShape) {
         console.log(player.id, shape.id)
    }
}
```

### OnUnDetect

`since v4.1.0`

If a player or other event leaves the shape attached to the event, it triggers the hook.

Example: 

```ts
import { RpgEvent, EventData, RpgPlayer, ShapePositioning } from '@rpgjs/server'

@EventData({
    name: 'EV-1'
})
export class CharaEvent extends RpgEvent {
    onInit() {
         this.attachShape({
            height: 100,
            width: 100,
            positioning: ShapePositioning.Center
        })
    }
    onDetectOutShape(player: RpgPlayer, shape: RpgShape) {
        console.log(player.id, shape.id)
    }
}
```

## RpgEvent methods

<!--@include: ../api/RpgEvent.md-->