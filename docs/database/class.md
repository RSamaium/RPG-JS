# Classes

<!--@include: ../partials/prerequisites-data.md-->

## Full Class 

```ts
import { RpgPlayer } from '@rpgjs/server'
import { Class } from '@rpgjs/database'

@Class({  
    name: 'Fighter',
    description: 'A great fighter!',
    equippable: [],
    skillsToLearn: [],
    statesEfficiency: [],
    elementsEfficiency: []
})
export class Fighter {
    onSet(player: RpgPlayer) {

    }
}
```

## API 

<!--@include: ../api/Class.md-->