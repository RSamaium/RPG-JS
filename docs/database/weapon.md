# Weapons

<!--@include: ../partials/prerequisites-data.md-->

## Example of full weapon:

```ts
import { RpgPlayer } from '@rpgjs/server'
import { Weapon } from '@rpgjs/database'

@Weapon({  
    name: 'Sword',
    description: 'Gives 100 HP',
    price: 2000,
    atk: 10,
    pdef: 10,
    sdef: 10,
    addStates: [],
    removeStates: [],
    elements: [],
    effects: [],
    params: {
        maxhp
    },
    paramsModifier: {

    },
    statesDefense: [],
    elementsDefense: []
})
export class Sword {
    onAdd(player: RpgPlayer) {

    }

    onEquip(player: RpgPlayer, equip: boolean) {

    }

    onRemove(player: RpgPlayer) {

    }
}
```

## API

<!--@include: ../api/Weapon.md-->