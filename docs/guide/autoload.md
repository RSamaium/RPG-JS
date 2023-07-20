# Structure

The structure of RPGJS v4 works in two ways:
- Auto loading of the structure
- Without self-loading of the structure

It is recommended to make the game with auto loading. It will simplify the development.

## AutoLoad

Just follow the file nomenclature. They will be understood automatically by the compiler of RPGJS:

```
* [module-name]
    * characters
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


::: tip Characters Folder
By default, spritesheets are found in characters but you can create other folders 

At this point, add in `rpg.toml`:

```toml
spritesheetDirectories = ['animations'] # others directories
```
:::

::: tip
In the case of spritesheets, note that the file names also become the identifiers to be used in the code.

Example:

* [module-name]
    * characters
        * hero.png
        * spritesheet.ts

And in code:

```ts
player.setGraphic('hero') // hero is both the id and the file name (hero.png)
```
:::