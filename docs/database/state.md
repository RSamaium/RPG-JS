# States

## Prerequisites

<!--@include: ../partials/prerequisites-data.md-->

## Example of full state:

```ts
import { RpgPlayer } from '@rpgjs/server'
import { State } from '@rpgjs/database'

@State({  
    name: 'Paralyse',
    description: 'The player is paralyzed',
    effects: [],
    paramsModifier: [],
    statesEfficiency: [],
    elementsEfficiency: []
})
export class Paralyse {
    
}
```

## API

<!--@include: ../api/State.md-->