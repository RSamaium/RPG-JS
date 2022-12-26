# Start Guide. Create a HP bar

## Prerequisites

1. You must be familiar with the [VueJS v3](https://v3.vuejs.org) framework

## It is necessary to know

1. Each user interface uses the DOM and not HTML5 Canvas. Why not? Because it is easier to create interfaces with components than with canvas graphics.
2. Each GUI has an identifier. Predefined identifiers exist to manage existing GUI (dialog, main menu, shop, etc.).

## Goal

We want to create a life bar. It will remain in hauy on the left side of the screen.

![Hud](/assets/hud.png)


## Component

```vue
<template>
    <div class="health-bar">
        <p>{{ hp }} / {{ maxHp }}</p>
        <div class="bar">
            <div class="inner-bar" :style="{ width }"></div>
        </div>
    </div>
</template>

<script>
export default {
    name: 'my-hud',
    data() {
        return {
            hp: 0,
            maxHp: 0
        }
    },
    mounted() {
       // We listen to the change in HP
    },
    computed: {
        width() {
            return ((this.hp / this.maxHp) * 100) + '%'
        }
    }
}
</script>

<style>
.health-bar {
    width: 200px;
    margin-top: 10px;
    margin-left: 10px;
    background: rgba(0, 0, 0, 0.3)
}

.health-bar p {
    margin: 5px;
    color: white;
    font-size: 21px;
    font-weight: bold;
}

.bar {
    border: 2px solid black;
    border-radius: 5px;
    position: relative;
}

.inner-bar {
  background: #c54;
  height: 10px;
  position: relative;
  transition: width .5s linear;
}
</style>
```

Put the property `name` and give a name to your component. It can be called via the server

> Don't prefix the names with `rpg-` because it's reserved for pre-built GUIs

## Listen to parameter changes

```js{3,11-17,23-25}
export default {
    name: 'my-hud',
    inject: ['rpgCurrentPlayer'],
    data() {
        return {
            hp: 0,
            maxHp: 0
        }
    },
    mounted() {
        this.obsCurrentPlayer = this.rpgCurrentPlayer
            .subscribe(({ object }) => {
                this.hp = object.hp
                this.maxHp = object.param.maxHp
            })
    },
    computed: {
        width() {
            return ((this.hp / this.maxHp) * 100) + '%'
        }
    },
    unmounted() {
        this.obsCurrentPlayer.unsubscribe()
    }
}
```

1. Inject a service named `rpgCurrentPlayer`
2. This service is an [Observable](https://github.com/ReactiveX/rxjs). Subscribe to it to read the last value. In the parameter, you get an object representing the current player
3. Remember to unsubscribe to the observable to avoid memory leaks

## Add HUD to your game

### Client Side

1. Client Side (in <PathTo to="clientIndex" />)

```ts{5-7}
import { RpgClient, RpgClientEngine } from '@rpgjs/client'
import hud from './gui/hud.vue'

@RpgModule<RpgClient>({
    gui: [
       hud
    ]
})
export default RpgClientEngine { }
```

2. Add in the `gui` property, a new element: your VueJS component.

### Server Side

On the server side, you can call the menu at any time:

In <PathTo to="serverDir" file="player.ts" />:

```ts{8}
import { RpgPlayer, RpgPlayerHooks } from '@rpgjs/server'

export const player: RpgPlayerHooks = {
    async onConnected(player: RpgPlayer) {
        player.setHitbox(20, 16)
        player.setGraphic('male1_2')
        await player.changeMap('medieval')
    }

    onJoinMap(player: RpgPlayer) {
        player.gui('my-hud').open() // Here, open the HUD after loading the map
    }
}
```