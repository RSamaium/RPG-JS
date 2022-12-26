# Skills

<Partial page="prerequisites-data" />

## Full Skill

```ts
import { RpgPlayer } from '@rpgjs/server'
import { Skill } from '@rpgjs/database'

@Skill({  
    name: 'Fire',
    description: 'Shoots a ball of fire',
    spCost: 10,
    power: 100,
    variance: 10,
    hitRate: 1,
    addStates: [],
    removeStates: [],
    elements: [],
    coefficient: {}
})
export class Fire {
    onLearn(player: RpgPlayer) {

    }

    onUse(player: RpgPlayer) {

    }

    onForget(player: RpgPlayer) {

    }
}
```

## API 

<ApiContent page="Skill" />