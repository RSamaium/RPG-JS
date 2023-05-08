# Items

<!--@include: ../partials/prerequisites-data.md-->

## Example of full item:

```ts
import { RpgPlayer } from '@rpgjs/server'
import { Item } from '@rpgjs/database'

@Item({  
    name: 'Potion',
    description: 'Gives 100 HP',
    price: 200,
    hpValue: 100,
    hitRate: 1,
    consumable: true,
    addStates: [],
    removeStates: [],
    elements: [],
    effects: [],
    paramsModifier: {}
})
export class Potion {
    onAdd(player: RpgPlayer) {

    }

    onUse(player: RpgPlayer) {

    }

    onUseFailed(player: RpgPlayer) {

    }

    onRemove(player: RpgPlayer) {

    }
}
```

## API

<!--@include: ../api/Item.md-->