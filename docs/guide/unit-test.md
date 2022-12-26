# Unit Tests

## Prerequisites

1. You must know [Jest](https://jestjs.io)
2. The tests apply to the server side

## Create a unit test

1. Create a file in the `tests` folder. This folder must be outside the `src` folder.
2. the file must end with `.spec.ts`

```ts
import { RpgWorld, RpgPlayer } from '@rpgjs/server'
import { testing, clear } from '@rpgjs/testing'
import modules from '../src/modules'

let player: RpgPlayer

beforeEach(async () => {
    const fixture = testing(modules, {
        basePath: __dirname + '/../'
    })
    const client = await fixture.createClient()
    player = RpgWorld.getPlayer(client.playerId)
})

test('test player', () => {
    expect(player).toBeDefined()
})

afterEach(() => {
    clear()
})
```

In the `beforeEach()` function, you must: 

1. Wrap your server class with the `testing()` function. It will allow you to emulate a client. 
2. Create a client
3. Using the [RpgWorld class](/classes/world.html), retrieve the player according to his identifier
4. Add the `clear()` function in `afterEach` to empty the cards and players in memory, and start from 0 for the next test

You can make tests ! 

### Example of a test

```ts
test('check that after the connection, the player is on the map named town', () => {
    const map = player.getCurrentMap()
    expect(map.id).toBe('town')
})
```

## Launch unit tests

Add the code in `jest.config.js`:

```js
const jestConfig = require('@rpgjs/compiler/jest')
module.exports = jestConfig
```

> If you want to extend the configuration of Jest:
> ```js
> const jestConfig = require('@rpgjs/compiler/jest')
> module.exports = {
>    ...jestConfig,
>    verbose: true
> }
> ```

Run the following command line :

`NODE_ENV=test npx jest`