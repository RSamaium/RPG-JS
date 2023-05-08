# Actors

<!--@include: ../partials/prerequisites-data.md-->

## Full Actor 

```ts
import { RpgPlayer, Presets } from '@rpgjs/server'
import { Fighter } from 'my-database/classes/fighter' // Remember to put a correct import
import { Actor } from '@rpgjs/database'

const { MAXHP } = Presets

@Actor({  
    name: 'Hero',
    description: 'A great fighter!',
    initialLevel: 1,
    finalLevel: 99,
    expCurve: {
        basis: 30,
        extra: 20,
        accelerationA: 30,
        accelerationB: 30
    },
    parameters: {
        [MAXHP]: {
            start: 700,
            end: 10000
        }
    },
    startingEquipment: [],
    class: Fighter 
})
export class Hero {
    onSet(player: RpgPlayer) {
        
    }
}
```

## API 

<!--@include: ../api/Actor.md-->