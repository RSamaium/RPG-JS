# Structure

The structure of RPGJS v4 works in two ways:
- Auto loading of the structure
- Without self-loading of the structure

It is recommended to make the game with auto loading. It will simplify the development.

## AutoLoad

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

### Without file detection

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

`index.ts` may contain this:

```ts
import client from 'client!./client'
import server from 'server!./server'

export default {
    client,
    server
}
```

It's up to you to define the contents of the client and server

More: [Create Module](/guide/create-module.html)

::: tip
This structure remains interesting if you want to create a plugin to share with the community.
:::
