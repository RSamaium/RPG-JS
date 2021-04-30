import Tile from './Tile';
import { Utils } from '@rpgjs/common'

import { pixi_tilemap } from 'pixi-tilemap'

const { arrayFlat } = Utils

pixi_tilemap.Constant.maxTextures = 4;

export default class TileLayer extends PIXI.Container {

    tilemap
    properties: any

    static findTileSet(gid, tileSets) {
        let tileset;
        for (let i = tileSets.length - 1; i >= 0; i--) {
            tileset = tileSets[i];
            if (tileset.firstGid && tileset.firstGid <= gid) {
                break;
            }
        }
        return tileset;
    }

    constructor(private layer, private tileSets) {
        super();
        this.alpha = layer.opacity;
        Object.assign(this, layer);
    }

    createTile(x: number, y: number, options: any = {}): Tile | undefined {
        const { real, filter } = options
        const { width, tileWidth, tileHeight } = this.layer.map.data
        if (real) {
            x = Math.floor(x / tileWidth)
            y = Math.floor(y / tileHeight)
        }
        const i = x + y * width;
        if (!(
            this.layer.tiles[i] &&
            this.layer.tiles[i].gid &&
            this.layer.tiles[i].gid !== 0
        ))  return

        const tileset = TileLayer.findTileSet(
            this.layer.tiles[i].gid,
            this.tileSets
        )
            
        if (!tileset) return 

        const tile = new Tile(
            this.layer.tiles[i],
            tileset,
            this.layer.horizontalFlips[i],
            this.layer.verticalFlips[i],
            this.layer.diagonalFlips[i]
        )

        tile.x = x * tileWidth;
        tile.y =
            y * tileHeight +
            (tileHeight -
                tile.textures[0].height);

        tile._x = x;
        tile._y = y;

        if (tileset.tileOffset) {
            tile.x += tileset.tileOffset.x;
            tile.y += tileset.tileOffset.y;
        }

        if (filter) {
            const ret = filter(tile)
            if (!ret) return
        }

        return tile
    }

    create() {
        this.tilemap = new pixi_tilemap.CompositeRectTileLayer()
        const { width, height } = this.layer.map.data
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) { 
                const tile = this.createTile(x, y)
                if (tile) {
                    const frame = this.tilemap.addFrame(tile.texture, tile.x, tile.y)
                    tile.setAnimation(frame)
                }
            }
        }
        this.addChild(this.tilemap)
    }
}