# Unit Testing in RPGJS Project

Unit testing is an essential part of ensuring the reliability and correctness of your RPGJS project. This guide will walk you through the process of setting up and running unit tests using the `vitest` testing framework.

## Steps

Follow these steps to set up and run unit tests for your RPGJS project:

### 1. Install Dependencies

You need to install `vitest` ,`jsdom`, `canvas` and `@rpgjs/testing` packages. These packages will be used for testing and providing a simulated DOM environment for your tests.

```bash
npm install @rpgjs/testing vitest jsdom canvas --save-dev
```

### 2. Create a Test Folder

Create a `__test__` folder within the module where you want to add unit tests. For example, if you want to add tests for the `main` module, create a `__tests__` folder within the `main` module.

### 3. Add Test Files

Inside the `__test__` folder, create `.spec.ts` files for your unit tests. These files will contain your actual test cases.

### 4. Write Unit Tests

In your `.spec.ts` file, you can write unit tests using the provided RPGJS testing utilities along with the `vitest` framework. Here's an example of how you can structure your unit tests:

::: code-group

```typescript [main/__tests__/player.spec.ts]
import { RpgPlayer, RpgModule, RpgServer } from '@rpgjs/server';
import { testing, clear } from '@rpgjs/testing';
import { beforeEach, afterEach, test, expect } from 'vitest';
import player from '../player';
import { RpgClientEngine } from '@rpgjs/client';

@RpgModule<RpgServer>({
    player
})
class RpgServerModule { }

let currentPlayer: RpgPlayer;
let client: RpgClientEngine

beforeEach(async () => {
    const fixture = await testing([
        {
            server: RpgServerModule
        }
    ]);
    const clientFixture = await fixture.createClient();
    currentPlayer = clientFixture.player;
    client = clientFixture.client;
});

test('test name player', () => {
    expect(currentPlayer).toBeDefined();
    expect(currentPlayer.name).toBe('YourName')
});

afterEach(() => {
    clear();
});
```

```typescript [main/player.ts]
import { RpgPlayer, type RpgPlayerHooks, Control, Components } from '@rpgjs/server'

const player: RpgPlayerHooks = {
    onConnected(player: RpgPlayer) {
        player.name = 'YourName'
    }
}

export default player
```

:::

### 5. Update package.json

Add a test script in your `package.json` to run your unit tests using `vitest`. This script should reference the `vitest` configuration file.

```json
"scripts": {
    "test": "npx vitest --config node_modules/@rpgjs/compiler/src/test/vitest.config.ts"
}
```

### 6. Run Tests

To run your unit tests, execute the following command in your terminal:

```bash
npm test
```

This will initiate the unit tests using the `vitest` framework, and you'll see the test results in your terminal.