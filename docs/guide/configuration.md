# All configuration in rpg.toml

The configuration and properties of RPGJS are defined using a JSON schema, which can be used both server-side and client-side. These properties are then used in the `rpg.toml` configuration file to customize various aspects of your game.

## Properties

. Below is an overview of the available configuration properties along with their descriptions and usage constraints.

### `server`

Configuration properties related to the server-side of the RPG.

- `start`: (*object*) Information about the starting position.
  - `map`: (*string*) The map where the player starts.
  - `graphic`: (*string*) The graphic representation.
  - `hitbox`: (*array*) The hitbox coordinates.
- `spritesheetDirectories`: (*array*) Directories for spritesheets.
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