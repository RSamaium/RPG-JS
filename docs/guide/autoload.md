# Structure

<div class="autoload-api">

Just follow the file nomenclature. They will be understood automatically by the compiler of RPGJS:

```
* [module-name]
    * spritesheets
        * [directory-name]
            * [spritesheet-name].(png|jpeg|gif)
            * [spritesheet-name].ts
    * sounds
        * [sound-name].(mp3|ogg)
        * [sound-name].ts (optional)
    * gui
        * [gui-name].(vue)
    * database
        * [item-name].ts
    * events
        * [event-name].ts
    * maps
        * [map-name].tmx
        * [map-name].ts (optional)
        * [tileset-name].tsx
        * [tileset-name].png
    * worlds
        * [maps-directory]
            * [map-name].tsx
            * [tileset-name].tmx
            * [tileset-name].png
        * [world-name].world
    * player.ts
    * sprite.ts
    * server.ts
    * client.ts
    * scene-map.ts
* .env
* index.html
* package.json
* theme.scss
* tsconfig.json
* rpg.toml
```

If the files are found, they will be automatically loaded! The bracketed names are file names that you can invent

::: tip
For all directories , It is possible to create subfolders to improve the structure for large projects
:::

::: tip
He doesn't have to have all these files. The minimum is

```
* index.html
* package.json
* tsconfig.json
* rpg.toml
```
:::


::: tip Spritesheets Folder
In spritesheets, each folder must have a single .ts file defining size and animations

You can also search for spritesheets in folders defined by `spritesheetDirectories` in rpg.toml

At this point, add in `rpg.toml`:

```toml
spritesheetDirectories = ['my_spritesheets_directory'] # others directories
```

> It concerns all modules
:::

::: tip
In the case of spritesheets, note that the file names also become the identifiers to be used in the code.

Example:

* [module-name]
    * spritesheets
        * characters
            * hero.png
            * spritesheet.ts

And in code:

```ts
player.setGraphic('hero') // hero is both the id and the file name (hero.png)
```
:::

</div>

<div class="module-api">

```
* [module-name]
    * index.ts
    * server
        * index.ts
    * client
        * index.ts
* index.html
* package.json
* tsconfig.json
* rpg.toml
```

`[module-name]/index.ts` may contain this:

```ts
import client from 'client!./client'
import server from 'server!./server'

export default {
    client,
    server
}
```

It's up to you to define the contents of the client and server

::: tip
This structure remains interesting if you want to create a plugin to share with the community.
:::


notice that we have added loaders (`client!` and `server!`) in order to ignore the part depending on which side we are located. For example, the client is ignored on the server side. Its value is `null`

We can also use other loaders: 

- `mmorpg!`: 
- `rpg!`
- `development!`
- `production!`

::: tip
If you are not using the automatic loading system

Then put the module in the <PathTo to="moduleIndex" /> file:

```ts
import mymodule from './mymodule'

export default [
    mymodule
]
```
:::


## Create the client-side module

In the `mymodule/client/index.ts` file, create a module with the `@RpgModule` decorator:

```ts
import { RpgClient, RpgModule } from '@rpgjs/client'
import { sprite } from './sprite' // optional
import { sceneMap } from './map' // optional

@RpgModule<RpgClient>({ 
    sprite, // optional
    scenes: { // optional
        map: sceneMap
    }
})
export default class RpgClientEngine {}
```

In the module, you can specify the sprite, the scene map or the graphic contents of the game

[See RpgClient options](/classes/client.html#rpgclient-decorator)

## Create the server side module

In the `mymodule/server/index.ts` file, create a module with the `@RpgModule` decorator:

```ts
import { RpgServer, RpgModule } from '@rpgjs/server'
import { player } from './player' // optional

@RpgModule<RpgServer>({ 
    player, // optional
    maps: [] // optional
})
export default class RpgServerEngine {}
```

In the module, you can specify the map, player, etc.

[See RpgServer options](/classes/server.html#rpgmodule-rpgserver-decorator)

## Module with options

Encapsulate the class in a function. This will allow you to pass custom options to the module

`mymodule/server/index.ts`

```ts
import { RpgServer, RpgModule, RpgPlayerHooks, RpgPlayer } from '@rpgjs/server'

const player = (version): RpgPlayerHooks => {
    return {
        onConnected(player: RpgPlayer) {
            console.log(version)
        }
    }
}

export default (options = {}) => {
    @RpgModule<RpgServer>({ 
        player: player(options.version) // example of options
    })
    class RpgServerEngine {}
    return RpgServerEngine
}
```

Then put an array where the second element represents the options for the server or the client

<PathTo to="moduleIndex" />

```ts
import mymodule from './mymodule'

export default [
    [mymodule, {
        server: {
            version: '1.0.0'
        },
        /*
        // for options client side
        client: {

        }
        */
    }]
]
```

::: danger
The module list file is executed on both the server and client side. Do not put sensitive information in this file.
If you pass sensitive information, create an external file (e.g. `config.ts`) that will be opened with the server `loader!`

In `src/config.ts`:

```ts
export default {
    privateKey: 'secret'
}
```

In <PathTo to="moduleIndex" />

```ts
import mymodule from './mymodule'
import config from 'server!../config.ts'

export default [
    [mymodule, {
        server: config
    }]
]
```
:::


</div>

