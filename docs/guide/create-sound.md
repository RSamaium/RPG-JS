# Put sounds and music

<div class="autoload-api">

## Structure

Here is the structure: 

* main
    * sounds
        * town.(mp3|ogg)
  
## Add sound in map

To quickly add a sound, add a personality property to the map (in Tiled Map Editor) named sounds. Put the sound ID of the resource

![tiled world](/assets/map-sound.png)



## Parameters of the sound (optional)

Add a file named `town.ts` in the directory `sounds` and add the following code:

```ts
import { Sound } from '@rpgjs/client'

@Sound({
    sounds: {
        town: require('./town.mp3'),
    },
    loop: true
})
export class TownMusic {}
```

More information on the parameters: [Sound Class](/classes/sound.html)

</div>
<div class="module-api">

## Structure

Here is the structure: 

* src
    * client
        * sounds
            * assets
                * my-music.ogg
            * index.ts

# Create music

<PathTo to="baseModule" file="client/sounds/index.ts" />

```ts
import { Sound } from '@rpgjs/client'

@Sound({
    sounds: {
        town: require('./my-music/music.ogg'),
    },
    loop: true
})
export class Musics {}
```

- `town` is the identifier of the resource. We indicate that the sound will be played in a loop because it is a music for a map

Then add the sound in a module. For your main game, add it to the <PathTo to="clientIndex" /> file

```ts
import { RpgModule, RpgClient } from '@rpgjs/client'
import { Sounds } from './sounds'

@RpgModule<RpgClient>({
    sounds: [
        Musics
    ]
})
export default class RpgClientEngine {}
```

## Use sound in the game

As soon as a map is opened:

```ts
import { RpgMap, MapData } from '@rpgjs/server'

@MapData({
    id: 'medieval',
    file: require('./tmx/medieval.tmx'),
    name: 'Town',
    sounds: ['town'] // You can add several musics
})
export class MedievalMap extends RpgMap { }
```
</div>