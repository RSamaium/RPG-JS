# Step 3a. Create map

## Prerequisites

1. To create a map, you need the Tiled Map Editor : [https://www.mapeditor.org/](https://www.mapeditor.org/)
2. You have already created the client-side tileset

## It is necessary to know

1. The maps are transformed into JSON format and saved in a `maps` folder
1. Note that maps are created on the server side. The map data is known only when the player goes to the map.
2. Maps are cached. If the server is not restarted, it will draw from memory to retrieve the map. If this is the first time it is opened, there will be a file reading (MMORPG) or an ajax request (RPG).

## Create map with Tiled Map Editor

1. Save the TMX file in <PathTo to="mapDir" file="client/tmx/medieval.tmx" />
2. Remember to put the TXS files in the same folder

## Create Map class

1. Create a new file: <PathTo to="mapDir" file="medieval.ts" />
2. Then, the code must be as follows

```ts
import { RpgMap, MapData } from '@rpgjs/server'

@MapData({
    id: 'medieval',
    file: require('./tmx/medieval.tmx'),
    name: 'Town' // optional
})
export class MedievalMap extends RpgMap { }
```

3. Put an identifier to the map. this information will be used if you want to load maps to a player.
4. Set the absolute path to the tmx file.

## Add Map in your Game

In <PathTo to="serverIndex" /> :

```ts
import { RpgServer, RpgModule } from '@rpgjs/server'
import { MedievalMap } from './maps/medieval.ts'

@RpgModule<RpgServer>({
    maps:  [
        MedievalMap
    ]
})
export default class RpgServerEngine { }
```

1. Add the map created in the property `maps` in the `@RpgModule` decorator

::: tip
Here you have referenced the cards in the game, but it does not display the card. To display the map on the client side, [you need to use `player.changeMap()`](/guide/player-start.html#start-position)
:::