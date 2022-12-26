# Modify an event according to an external situation

## Prerequisites

- [Know how to create an event and attach it to a map](/guide/create-event.html)

## Goal

Sometimes you have events that update themselves according to external events. Imagine the following scene: the hero presses a lever that opens a door. 

# Creation of events

Let's create two events on the map, 
1. for the lever
2. for the door

<PathTo to="eventDir" file="lever.ts" />

```ts 
import { RpgEvent, EventData, RpgPlayer } from '@rpgjs/server'

@EventData({
    name: 'Lever'
})
export class LeverEvent extends RpgEvent {
    onInit() {
        this.setGraphic('lever') // On the client side, you have created a spritesheet
    }
    onAction(player: RpgPlayer) {
        const currentValue = player.getVariable('LEVER')
        player.setVariable('LEVER', !currentValue)
    }
}
```

When the player presses the lever (with the action key), we set a variable to true / false

> You can also change the graphic, to animate the lever (we do not do it here)

### Door

<PathTo to="eventDir" file="door.ts" />

```ts 
import { RpgEvent, EventData, RpgPlayer } from '@rpgjs/server'

@EventData({
    name: 'Lever'
})
export class DoorEvent extends RpgEvent {
    onInit() {
        this.setGraphic('door_closed') // On the client side, you have created a spritesheet
    }
    onChanges(player: RpgPlayer) {
        const isOpened = player.getVariable('LEVER')
        if (isOpened) {
            this.setGraphic('door_opened')
        }
        else {
            this.setGraphic('door_closed')
        }
    }
}
```

With, `onChanges`, a listening is done on a potential change. You can then update the door graphics according to the state of the `LEVER` variable

> Note that in MMORPG mode, everyone sees the change of the door graphics even if the variable is changed only for the player. Switch the event to Scenario mode if you want to make a single event per player