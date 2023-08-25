# Unit Testing in RPGJS Project

Unit testing is an essential part of ensuring the reliability and correctness of your RPGJS project. This guide will walk you through the process of setting up and running unit tests using the `vitest` testing framework along with `jsdom`.

## Steps

Follow these steps to set up and run unit tests for your RPGJS project:

### 1. Install Dependencies

You need to install `vitest` and `jsdom` packages. These packages will be used for testing and providing a simulated DOM environment for your tests.

```bash
npm install vitest jsdom --save-dev
```

### 2. Create a Test Folder

Create a `__test__` folder within the module where you want to add unit tests. For example, if you want to add tests for the `main` module, create a `__tests__` folder within the `main` module.

### 3. Add Test Files

Inside the `__test__` folder, create `.spec.ts` files for your unit tests. These files will contain your actual test cases.

### 4. Write Unit Tests

In your `.spec.ts` file, you can write unit tests using the provided RPGJS testing utilities along with the `vitest` framework. Here's an example of how you can structure your unit tests:

```typescript
import { RpgPlayer, RpgModule, RpgServer } from '@rpgjs/server';
import { testing, clear } from '@rpgjs/testing';
import { beforeEach, afterEach, test, expect } from 'vitest';
import player from './player';

@RpgModule<RpgServer>({
    player
})
class RpgServerModule {}

let currentPlayer: RpgPlayer;

beforeEach(async () => {
    const fixture = await testing([
        {
            server: RpgServerModule
        }
    ]);
    const clientFixture = await fixture.createClient();
    currentPlayer = clientFixture.player;
});

test('test player', () => {
    expect(currentPlayer).toBeDefined();
});

afterEach(() => {
    clear();
});
```

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