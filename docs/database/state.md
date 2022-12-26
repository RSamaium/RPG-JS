# States

## Prerequisites

<Partial page="prerequisites-data" />

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

<ApiContent page="State" />