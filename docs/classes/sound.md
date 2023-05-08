# RpgSound

1. You have to create a sound with the `Sound` decorator
2. You can then use the sound when starting a amp, an animation or any action

## Sound Decorator

Example: 

```ts
import { Sound } from '@rpgjs/client'

@Sound({
    id: 'town-music',
    sound: require('./sound/town.ogg')
})
export class TownMusic {}
```

[Put the created class in the RpgClient decorator](/classes/client.html#rpgclient-decorator)

### Properties 

<!--@include: ../api/Sound.md-->

## Use RpgSound

Use the RpgSound class to edit the sound: 

```ts
import { RpgSound } from '@rpgjs/client'

RpgSound.get('town-music').play()
```

All sound methods come from the HowlerJS library:

[https://github.com/goldfire/howler.js#methods](https://github.com/goldfire/howler.js#methods)

## Global Sound

You can globally manage all the sounds. For example, decrease the volume globally

```ts
import { RpgSound } from '@rpgjs/client'

RpgSound.global.volume(0.2)
```

All sound methods come from the HowlerJS library:

[https://github.com/goldfire/howler.js#global-methods](https://github.com/goldfire/howler.js#global-methods)

