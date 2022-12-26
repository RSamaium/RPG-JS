# SpriteSheet Decorator

## Example SpriteSheet 

![Animation](/assets/animation.png)

```ts
import { Spritesheet } from '@rpgjs/client'

const to = () => {
    const array: any = []
    let k = 0
    for (let i=0 ; i < 4 ; i++) {
        for (let j=0 ; j < 5 ; j++) {
            array.push({ time: k * 5, frameX: j, frameY: i })
            k++
        }
    }
    return array
}

@Spritesheet({
    id: 'shield',
    image: require('./assets/animation.png'),
    framesWidth: 5,
    framesHeight: 4,
    width: 960,
    height: 768,
    opacity: 1,
    anchor: [0.5],
    textures: {
        default: {
            /*
            animations: [
                [ 
                    { time: 0, frameX: 0, frameY: 0 },
                    { time: 5, frameX: 1, frameY: 0 } ,
                    { time: 10, frameX: 2, frameY: 0 } ,
                    { time: 15, frameX: 3, frameY: 0 }
                    // etc...
                ]
            ]
            */
            animations: [ to() ]
        }
    }
})
export class ShieldAnimations {}
```

You can call the animation

### Client Side

On the scene

```ts
import { RpgSceneMapHooks, RpgSceneMap } from '@rpgjs/client'

export const sceneMap: RpgSceneMapHooks = {
    onAfterLoading(scene: RpgSceneMap) {
        scene.showAnimation({
             graphic: 'shield',
             animationName: 'default',
             attachTo: scene.getCurrentPlayer()
         })
    }
}
```

[Show Animation method](/classes/scene-map.html#rpgscene)

### Server Side

Use the `showAnimation()` command:

```ts
player.showAnimation('shield', 'default')
```

it will display the animation on the player and will be visible to all other players


## Properties

<ApiContent page="Spritesheet" />

## Create Animation with Timeline system

<ApiContent page="Timeline" />