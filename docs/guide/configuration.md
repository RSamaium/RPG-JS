# All configuration in rpg.toml

The configuration and properties of RPGJS are defined using a JSON schema, which can be used both server-side and client-side. These properties are then used in the `rpg.toml` configuration file to customize various aspects of your game.

## Properties

. Below is an overview of the available configuration properties along with their descriptions and usage constraints.

### `compiler`

Configuration properties related to the compiler.

- `type`: (*string*) The type of the RPG. Can be either "rpg" or "mmorpg".

- `modulesRoot`: (*string*) The root directory for modules. (since 4.3.0)

- `modules`: (*array*) List of modules to load.

Example:

```toml
modules = ["./main", "@rpgjs/gamepad"]
```

- `autostart`: (*boolean*) Finds the starting point selector and displays the game directly. (`true` by default). Since 4.3.0

If `false`, it can be loaded as follows:

```ts
import { RpgClientEngine, inject } from '@rpgjs/client';

const client = inject(RpgClientEngine)
await client.start()
```

- `compilerOptions`
  - `alias`: (*object*) Aliases. Use aliases in Typescript imports
    ```toml
    [compilerOptions.alias]
      "@" = "./src"
    ```
  - `pwaEnabled`: (*boolean*) Whether the PWA feature is enabled. (`true` by default)
  - `outputDir`: (*string*) Output directory for the build.
  - `serverUrl`: (*string*) Server URL.

- `vite`: (*object*) All [Vite configuration](https://vitejs.dev/config/). Example:
    ```toml
    [vite]
      logLevel = "silent"
    ```
    > Please note that RPGJS contains configurations. You will therefore overwrite configurations ([the basic file is in the sources]([https://github.com/RSamaium/RPG-JS/blob/v4/packages/compiler/src/build/client-config.ts#L335])).

  - `vitest`: (*object*) All [Vitest configuration](https://vitest.dev/config/). Example:
    ```toml
    [vitest]
      silent = true
    ```
    >  You will therefore overwrite configurations ([the basic file is in the sources]([https://github.com/RSamaium/RPG-JS/blob/v4/packages/compiler/src/test/vitest.config.ts#L36])).

- `express`

  Configuration properties related to the Express server.

  - `static`: (*string*) Specifies the directory from which to serve static files.
    > only for final files put into production
  - `port`: (*integer*) The port number on which the Express server listens.

Example:

```toml
[express]
  static = 'public'
  port = 3000
```

- `express.json`

Configuration properties for JSON middleware. Documentation: [express.json](https://expressjs.com/en/api.html#express.json)

Example:

```toml
[express.json]
  limit = "100kb"
```

- `express.cors`

Configuration properties for CORS middleware. Documentation: [cors](https://expressjs.com/en/resources/middleware/cors.html)

- `express.socketIo`

Configuration properties for SocketIO middleware. Documentation: [socket.io](https://socket.io/docs/v4/server-initialization/)

-  `socketIoClient`

All [SocketIO client configuration](https://socket.io/docs/v4/client-initialization/).

Example:

```toml
[socketIoClient]
    withCredentials = true
```

- `spritesheetDirectories`: (*array*) Directories for spritesheets.

### `server`

Configuration properties related to the server-side of the RPG.

- `start`: (*object*) Information about the starting position.
  - `map`: (*string*) The map where the player starts.
  - `graphic`: (*string*) The graphic representation.
  - `hitbox`: (*array*) The hitbox coordinates.
- `api`: (*object*) API settings. **WIP**
  - `enabled`: (*boolean*) Whether the API is enabled.
  - `authSecret`: (*string*) Authentication secret.

### `client`

Configuration properties related to the client-side of the RPG.

- `shortName`: (*string*) Short name of the game.
- `description`: (*string*) Game description.
- `themeColor`: (*string*) Theme color for the game.
- `icons`: (*array*) Game icons.
- `themeCss`: (*string*) Custom theme CSS.
- `matchMakerService`: (*string*) Matchmaking service.

- `canvas`: (*object*) Canvas configuration options.
  - `transparent`: (*boolean*) Whether the canvas should be transparent.
  - `autoDensity`: (*boolean*) Automatically adjust the canvas resolution to match the device's pixel ratio.
  - `antialias`: (*boolean*) Whether to use antialiasing for smoother graphics.
  - `resolution`: (*number*) The resolution of the canvas.
  - `preserveDrawingBuffer`: (*boolean*) Whether to preserve the drawing buffer.
  - `backgroundColor`: (*number*) Background color of the canvas.

- `selector`: (*string*) Selector for the game container.
- `selectorGui`: (*string*) Selector for the GUI container.
- `selectorCanvas`: (*string*) Selector for the canvas container.
- `standalone`: (*boolean*) Whether the game is standalone (not embedded).
- `drawMap`: (*boolean*) Whether to draw the map. For unit tests
- `maxFps`: (*number*) Maximum frames per second for rendering.
- `serverFps`: (*number*) Server frames per second.
- `pwa`: (*object*) : All [Vite PWA configuration](https://vite-pwa-org.netlify.app). If PWA is enabled.

### `Client and Server`

General configuration properties that can apply globally.

- `inputs`: (*object*) Input configurations.
  - Each input can be defined using an object with the following properties:
    - `repeat`: (*boolean*, default: `false`) Whether the input should be repeated when held.
    - `bind`: (*string* or *array*) The key or keys to bind the input to.
    - `delay`: (*object*) Delay settings for the input.
      - `duration`: (*number*, minimum: `0`) The delay duration in milliseconds.
      - `otherControls`: (*array*) Array of other control names to disable during the delay.
- `name`: (*string*) Name of the game.

## Example Usage

Below is an example usage of the RPG configuration in TypeScript:

```ts
import { RpgServerEngine } from '@rpgjs/server';
import { RpgServer, RpgModule } from '@rpgjs/server';

@RpgModule<RpgServer>({
    engine: {
        onStart(server: RpgServerEngine) {
            console.log(server.globalConfig.start.map)
        }
    }
 })
export default class RpgServerModuleEngine {}
```


## `rpg.toml`

You can use the RPG configuration in your `rpg.toml` configuration file. Here's an example:

```toml
# will only be read by the client
shortName = "My RPG"
description = "A fantastic RPG adventure!"
themeColor = "#ff9900"

# will only be read by the server
[start]
    map = "starting_map" 
```