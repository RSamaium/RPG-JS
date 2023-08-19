# Create items

## It is necessary to know

1. Here is the creation of items, skills, classes, weapons, etc...

##  Creating an item

### Solution 1: Static file

In <PathTo to="databaseDir" file="potion.ts" />

```ts
import { Item } from '@rpgjs/database'

@Item({
    id: 'potion',
    name: 'Potion',
    description: 'Gives 100 HP',
    price: 200,
    hpValue: 100
})
export default class Potion { }
```

::: tip
If you want to add other parameters, just create properties:

```ts
import { Item } from '@rpgjs/database'

@Item({  
   
})
export class Potion {
    otherParam = 'value'
}
```
:::

::: tip
You also have hooks

```ts
import { Item } from '@rpgjs/database'

@Item({  
   
})
export class Potion {
    onAdd(player: RpgPlayer) {

    }
}
```

take a look at the database APIs to see what else is possible: [/database/item.html](Items Database)
:::

### Solution 2: Dynamic data

With backend (example with axios request):

In <PathTo to="baseModule" file="server.ts" /> :

```ts
import { RpgServerEngineHooks, RpgServerEngine } from '@rpgjs/server'
import axios from 'axios'

const server: RpgServerEngineHooks = {
    async onStart(server: RpgServerEngine) {
        const res = await axios.get('https://my-backend-game/items')
        for (let item of res.data) {
             server.addInDatabase(item.id, item, 'item') // Put items in memory. The third parameter is the type, it could be weapon, armor, etc.
        }  
    }
}

export default server
```

Here it is at server loading but you can load items in other situations (when opening a maps, calling an event, etc.)

<div class="module-api">

## Add the item to your game

Add the <PathTo to="databaseDir" file="items/potion.ts" /> file

```ts
import { RpgServer, RpgModule } from '@rpgjs/server'
import { Potion } from './database/items/potion.ts'

@RpgModule<RpgServer>({
    database: {
        Potion
    }
})
export default class RpgServerEngine { }
```

</div>

## Using the item in an event

Add the <PathTo to="eventDir" file="chara.ts" /> file

```ts
import { RpgEvent, EventData, RpgPlayer } from '@rpgjs/server'

@EventData({
    name: 'EV-1'
})
export class CharaEvent extends RpgEvent {
    async onAction(player: RpgPlayer) {
       await player.showText('I give you a potion')
       player.addItem('potion') // id of item
    }
}
```

::: tip Bests Pratices
Either use the item's class or id: `player.addItem(Potion)` or `player.addItem('potion')`. 
The identifier is useful for dynamic objects or those retrieved via APIs. If this isn't the case, use the class, which will allow you to set a Typescript control.

In fact, you can use the class type to retrieve the item

```ts
const potion = player.getItem<Potion>('potion')
```
:::