# The structure of the project

## It is necessary to know

You are free to build your own structure but we propose a new structure below. It is still necessary to separate the server and client code even for an offline RPG.

## Explanation of the structure

Here is the structure of a project

* src
    * game
        * main
            * client
                * gui (optional)
                    * (your-gui).vue
                * characters (optional)
                    * (your-chara).ts 
                    * assets
                        (your-chara).png
                * maps (optional)
                    * (your-tileset).ts 
                    * assets
                        (your-tileset).png
                * sounds (optional)
                    * assets
                        (ypur-music).ogg
                * map.ts (optional)
                * sprite.ts (optional)
                * index.ts
            * server
                * maps (optional)
                    * tmx
                        * (your-map).tmx
                        * (your-tileset).tsx
                    * (your-map).ts
                * events (optional)
                    * (your-event).ts
                * database (optional)
                    * actors
                    * classes
                    * items
                    * skills
                    * states
                    * weapons
                    * index.ts
                * player.ts (optional)
                * index.ts
        * index.ts
    * client.ts
    * index.html
    * server.ts
* webpack.config.js
* tsconfig.json
* package.json
* index.d.ts
* rpg.json

As you can see, many of the files are optional. For example, you don't have to put events or a database or even maps. Just know that your game will not contain much :)