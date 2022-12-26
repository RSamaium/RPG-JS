# Create module

## Why ?

What is the point of creating a module? The main reason is to structure a project. Your game must be modular.

A module must be a system of your game. The start of the game itself is a module named main

Let's take an example of modules
- A combat system
- A menu or set of menus
- Maps representing a world
- A set of graphics on a theme

When you create a module, create a folder in the <PathTo to="modDir" /> folder. Here is the structure:

* src
    * modules
        * mymodule
            * client
                * index.ts
            * server
                * index.ts
            * index.ts

- the client folder will contain the module for the client part (spritesheets, sprites hooks, etc.)
- the server, will contain the server part (maps, player hooks, events, etc.)

the <PathTo to="modDir" file="mymodule/index.ts" /> file contains the following code:

```ts
import client from 'client!./client'
import server from 'server!./server'

export default {
    client,
    server
}
```

notice that we have added loaders (`client!` and `server!`) in order to ignore the part depending on which side we are located. For example, the client is ignored on the server side. Its value is `null`

We can also use other loaders: 

- `mmorpg!`: 
- `rpg!`
- `development!`
- `production!`

Then put the module in the <PathTo to="moduleIndex" /> file:

```ts
import mymodule from './mymodule'

export default [
    mymodule
]
```

## Create the client-side module

In the <PathTo to="modDir" file="mymodule/client/index.ts" /> file, create a module with the `@RpgModule` decorator:

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

In the <PathTo to="modDir" file="mymodule/server/index.ts" /> file, create a module with the `@RpgModule` decorator:

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

## Generate a module in command line

Go to the root of the project:

`npx rpgjs generate module <directory-name>`

## Module with options

Encapsulate the class in a function. This will allow you to pass custom options to the module

<PathTo to="modDir" file="mymodule/server/index.ts" />

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
