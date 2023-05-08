# Armors

<!--@include: ../partials/prerequisites-data.md-->

## Full Armor

```ts
import { RpgPlayer } from '@rpgjs/server'
import { Armor } from '@rpgjs/database'

@Armor({  
    name: 'Shield',
    description: 'Gives a little defense',
    price: 4000,
    pdef: 2000,
    sdef: 1000,
    addStates: [],
    removeStates: [],
    elements: [],
    effects: [],
    params: {},
    paramsModifier: {},
    statesDefense: [],
    elementsDefense: []
})
export class Shield {
    onAdd(player: RpgPlayer) {

    }

    onEquip(player: RpgPlayer, equip: boolean) {

    }

    onRemove(player: RpgPlayer) {

    }
}
```

## API 

<!--@include: ../api/Armor.md-->