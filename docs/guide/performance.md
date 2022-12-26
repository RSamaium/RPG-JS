# Performance

## How much space do maps take up in RAM?

A lot of effort has been put into making the cards take up as little space as possible in RAM. 

1. A map is put in RAM as soon as a player arrives on this map
2. All tile information of the tileset is put into RAM once and for all. This means that if another map uses the same tileset, then it will use the tileset already in RAM
3. All tiles per layer of a map are put in RAM. This is an essential optimization to reduce the CPU load on the search for collisions on tiles
4. When there are more players on the map, the map is freed from RAM

Here is the calculation to take into account for the RAM of all the tiles of a map:

**(map width * map height * number of layers * 4) bytes**

Example (a 100x100 map with 5 layers)

`100 * 100 * 5 * 4 = 200000 bytes = ~195 Kb`

:::tip
The calculation is the same for an almost empty layer and a filled layer. The memory allocation is the same
:::

### Tip to reduce the size in RAM

If you think you have big maps with lots of layers, it is possible to optimize RAM

You have two options:
1. either in the code, in the `@MapData` decorator, put the option [lowMemory: true](/classes/map.html#lowmemory)
2. or in Tiled Map Editor, create the following property on the map: `low-memory` with a boolean value of true

The size of a map ignored the number of layers

**(map width * map height * 4) bytes**

Example (a 100x100 map with 5 layers)

`100 * 100 * 4 = 40000 bytes = ~39 Kb`

:::warning
This option imposes some constraints:
- All methods that return TileInfo (as [getTileByPosition()](/classes/map.html#get-tile-by-position)) will only return the tile of the last layer 
- The [setTile()](/classes/map.html#change-tile-in-map) method on the map will not work
:::