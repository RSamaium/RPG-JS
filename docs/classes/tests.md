# Unit Tests API

Get the functions from the `@rpgjs/testing` package:

```ts
import { RpgPlayer } from '@rpgjs/server'
import { RpgClientEngine } from '@rpgjs/client'
import { testing, clear } from '@rpgjs/testing'
import modules from '../src/modules'

let player: RpgPlayer
let client: RpgClientEngine

beforeEach(async () => {
    const fixture = testing(modules, {
        basePath: __dirname + '/../'
    })
    const clientFixture = await fixture.createClient()
    client = clientFixture.client
    player = clientFixture.player
})

test('test player', () => {
    expect(player).toBeDefined()
})

test('test client', () => {
    expect(client).toBeDefined()
})

afterEach(() => {
    clear()
})
```

# Testing API

<ApiContent page="Testing" />

## Fixture API

<ApiContent page="FixtureTesting" />