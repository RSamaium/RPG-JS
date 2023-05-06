# Create Shape

## Prerequisites

You must have created a map and added in your game

## Why ?

A shape is an invisible zone on the map (it can be made visible, but not too interesting), which allows to trigger actions if you enter or leave this zone. The shape can be fixed or it can move on the map.
It is also possible to attach an area to a player/event. For example, create a vision system

## Fixed Shape

1. Open a map with Tiled Map Editor and go to the Object layer:

![layers](/assets/layers.png)

2. Click on `Insert Rectangle` and place the shape on the map

![add-shape](/assets/add-shape.png)


::: tip
Set the `collision` property to `true` to put a collision on the shape. [View Define collision](/guide/create-tileset.html#define-collisions)
:::

::: tip
You can put rectangles, circles and polygons. 
You should know that
- circles do not use height. The radius is the width divided by 2
- polygons use performance for collisions, don't overuse it
:::

3. Go to the file: <PathTo to="serverDir" file="player.ts" />

```ts
import { RpgPlayer, RpgShape, RpgPlayerHooks } from '@rpgjs/server'

const player: RpgPlayerHooks = {
    onInShape(player: RpgPlayer, shape: RpgShape) {
        console.log('in', player.name, shape.name)
    },
    onOutShape(player: RpgPlayer, shape: RpgShape) {
        console.log('out', player.name, shape.name)
    }
}

export default player
```

This way, you can know who is entering or leaving the shape

## Create Dynamic Shape in map

```ts
import { RpgPlayer, RpgMap, RpgPlayerHooks, RpgShape } from '@rpgjs/server'

const player: RpgPlayerHooks = {
    onJoinMap(player: RpgPlayer, map: RpgMap) {
        const shape: RpgShape = map.createShape({ 
            x: 10,
            y: 10,
            width: 100,
            height: 100,
            properties: {
                color: '0xDE3249'
            }
        })
    },
    onInShape(player: RpgPlayer, shape: RpgShape) {
        console.log('in', player.name, shape.name)
    },
    onOutShape(player: RpgPlayer, shape: RpgShape) {
        console.log('out', player.name, shape.name)
    }
}

export default player
```

Use the createShape method on the map. Here the shape is shared with the client. So, we can set a colour to see it on the client side

## Attaching a shape to a player (e.g. creating a vision)

We want to create a form that remains attached to the player. This shape is centred. We can know who enters or leaves the shape

![attach](/assets/attach-shape.png)

> The red square is invisible in your project. We have displayed it here to show the purpose

In <PathTo to="playerFile" />

```ts
import { RpgPlayer, RpgMap, RpgPlayerHooks, RpgShape, ShapePositioning } from '@rpgjs/server'

const player: RpgPlayerHooks = {
    onJoinMap(player: RpgPlayer, map: RpgMap) {
        player.attachShape({
            height: 100,
            width: 100,
            positioning: ShapePositioning.Center
        })
    },
    onInShape(player: RpgPlayer, shape: RpgShape) {
        console.log('in', player.name, shape.name)
    },
    onOutShape(player: RpgPlayer, shape: RpgShape) {
        console.log('out', player.name, shape.name)
    }
}

export default player
```

Here we position a shape of 100px width and height on the player