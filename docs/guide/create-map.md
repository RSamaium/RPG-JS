# Create map

## Prerequisites

To create a map, you need the Tiled Map Editor : [https://www.mapeditor.org/](https://www.mapeditor.org/)

## 1. Create tileset

1. Create a new tileset with Tiled Map Editor (`File` > `New` > `New Tileset`)
2. Set source and width and height of tile
3. Save the TSX file in <PathTo to="mapDir" file="medieval.tsx" />

::: tip
- Tile sizes may vary. In the example below, the size is 32px*32px but you can have more or less tile size.
- The width and height of the tileset does not matter. However, avoid having images that are too large. This may cause an error with WebGL
- You can have several tilesets for one map.
:::

Here is the spritesheet we will use. Save the PNG file in <PathTo to="mapDir" file="medieval.png" />

![medieval](/assets/medieval.png)

> **Warning**, the image above is only a part of the tileset

::: danger
For a tileset compatible with WebGL 1 (mainly mobiles), the image must be at most 4096*4096px
:::

::: danger
The size of the tiles must not exceed the dimensions of the image. For example, if the width of a tile is 32px but the width of the tileset is 60px then there will be a problem. The width of the tileset must be 64px
:::

### Collision on a tile

1. Select the tile (or several at the same time) and set a new property

![select tile](/assets/select-tile.jpeg)

2. Add the `collision` property of type `BOOL`

![add colission](/assets/add-colission.png)

3. Check the `collision` property on the selected tile

![set collision](/assets/set-colission.jpeg)

### tile above the character (Z Tile)

![z-tile](/assets/z-tile.png)

1. Select a tile
2. Set the `z` property

> Note that the z-value is added to the z-value of the layer. For example, in the image above, the top of the trunk is on z=1. But if the tree is on a layer of z=2 then the true value of the top of the trunk will be z=3.

## 2. Create map with Tiled Map Editor

1. Create your map and save the TMX file in <PathTo to="mapDir" file="medieval.tmx" />
2. Create object layer
3. Insert a point on the map

![start-player](/assets/start-player.png)

4. Set the `start` type

![start-player2](/assets/start-player2.png)