# Integrating RpgGame Component into a React App

This guide provides step-by-step instructions on how to insert an `RpgGame` component into a React application using ViteJS.

## Prerequisites

Ensure that you have a React application set up with ViteJS. Your `package.json` should include the following scripts:

```json
"scripts": {
    "dev": "rpgjs dev",
    "build": "rpgjs build"
}
```

## Step 1: Create the Game Directory

Create a new directory within your source folder:

```
src/game
```

## Step 2: Configure RPG Module

In your `rpg.toml` file, set the module root and disable autostart:

```toml
modulesRoot = './src/game'
autostart = false
```

> The `autostart` option prevents the engine from automatically searching for a div with the id `#rpg`. Instead, it will use the React component.

## Step 3: Import RpgGame Component

Import the `RpgGame` component from the RPGJS client package for React:

```javascript
import { RpgGame } from '@rpgjs/client/react';
```

## Step 4: Utilize RpgGame Component

Implement the `RpgGame` component with an `onReady` function:

```jsx
const onReady = ({ server, client }) => {
    // server is an instance of RpgServerEngine or null
    // client is an instance of RpgClientEngine
};

<RpgGame onReady={onReady} />
```

In MMORPG mode, `server` will be null. In RPG mode, you can access both client and server sides.

## Step 5: Advanced Configuration

To add modules via the React app, use the following setup:

```javascript
const [modules, setModules] = useState<any[]>([
    {
        server: {
            player: {
                onConnected(player) {
                    player.setHitbox(24, 24);
                    player.speed = 4;
                    player.setGraphic('hero');
                }
            }
        },
        client: {
            engine: {
                onStart() {
                    console.log('started')
                }
            }
        }
    }
]);

<RpgGame
    onReady={onReady}
    modules={modules}
/>
```

> In MMORPG mode, you only have access to the client API.
