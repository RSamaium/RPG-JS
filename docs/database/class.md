# Classes

<!--@include: ../partials/prerequisites-data.md-->

## Full Class 

```ts
import { RpgPlayer } from '@rpgjs/server'
import { Class } from '@rpgjs/database'
import type { ClassOnSet, ClassCanEquip, WeaponInstance, ArmorInstance } from '@rpgjs/database'

@Class({  
    name: 'Fighter',
    description: 'A great fighter!',
    skillsToLearn: [],
    statesEfficiency: [],
    elementsEfficiency: []
})
export class Fighter implements ClassOnSet, ClassCanEquip {
    // Called when the class is assigned to the player
    onSet(player: RpgPlayer): void { }

    // Return true if the player can equip the item
    canEquip(item: WeaponInstance | ArmorInstance, player: RpgPlayer): boolean { }
}
```

## API 

<!--@include: ../api/Class.md-->