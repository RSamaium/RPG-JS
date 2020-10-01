import * as PIXI from 'pixi.js';
import Tile from './Tile';

export default class TileLayer extends PIXI.Container {
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
      //  this.tiles = [];

        Object.assign(this, layer);

        this.create();
    }

    create() {
        const { width, height, tileWidth, tileHeight } = this.layer.map.data
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const i = x + y * width;
                if (
                    this.layer.tiles[i] &&
                    this.layer.tiles[i].gid &&
                    this.layer.tiles[i].gid !== 0
                ) {
                    const tileset = TileLayer.findTileSet(
                        this.layer.tiles[i].gid,
                        this.tileSets
                    );

                    if (tileset) {
                        const tile = new Tile(
                            this.layer.tiles[i],
                            tileset,
                            this.layer.horizontalFlips[i],
                            this.layer.verticalFlips[i],
                            this.layer.diagonalFlips[i]
                        );

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

                        if (tile.textures.length > 1) {
                            tile.animationSpeed = 1000 / 60 / tile.animations[0].duration;
                            tile.gotoAndPlay(0);
                        }

                      //  this.tiles.push(tile);

                        this.addChild(tile);
                    }
                }
            }
        }
    }
}