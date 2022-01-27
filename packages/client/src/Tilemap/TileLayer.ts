import Tile from './Tile';

import { pixi_tilemap, POINT_STRUCT_SIZE } from 'pixi-tilemap'

pixi_tilemap.Constant.maxTextures = 4
pixi_tilemap.Constant.use32bitIndex = true

export default class TileLayer extends PIXI.Container {

    tilemap
    properties: any
    tiles: any = {}

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
        const tileLayer = this.layer.tiles[i]
        if (!(
            tileLayer &&
            tileLayer.gid &&
            tileLayer.gid !== 0
        ))  return

        const tileset = TileLayer.findTileSet(
            tileLayer.gid,
            this.tileSets
        )
            
        if (!tileset) return 

        const tile = new Tile(
            tileLayer,
            tileset,
            this.layer.horizontalFlips[i],
            this.layer.verticalFlips[i],
            this.layer.diagonalFlips[i]
        )

        tile.x = x * tileWidth;
        tile.y =
            y * tileHeight +
            (tileHeight -
                tile.texture.height);

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

    changeTile(x: number, y: number) {
        const { tileWidth, tileHeight } = this.layer.map.data
        x = Math.floor(x / tileWidth)
        y = Math.floor(y / tileHeight)
        const oldTile: Tile = this.tiles[x + ';' + y]
        const newTile = this.createTile(x, y)
        if (!oldTile && newTile) {
            this.addFrame(newTile, x, y)
        }
        else {
            if (newTile) {
                const bufComposite: any = new pixi_tilemap.CompositeRectTileLayer()
                const frame = bufComposite.addFrame(newTile.texture, newTile.x, newTile.y)
                newTile.setAnimation(frame)
                this.tiles[x + ';' + y] = newTile
                const pointsBufComposite = bufComposite.children[0].pointsBuf
                // Change Texture (=0, 1 and 7, rotate (=4), animX (=5), animY (=6))
                ;[0, 1, 4, 5, 6, 7].forEach((i) => {
                    if (this.pointsBuf) this.pointsBuf[oldTile.pointsBufIndex+i] = pointsBufComposite[i]
                })
                this.tilemap.children[0].modificationMarker = 0
            }
            else {
                delete this.tiles[x + ';' + y]
                if (this.pointsBuf) this.pointsBuf.splice(oldTile.pointsBufIndex, POINT_STRUCT_SIZE)
            }
        }
    }

    get pointsBuf(): number[] | null {
        const child = this.tilemap.children[0]
        if (!child) return null
        return child.pointsBuf 
    }

    private addFrame(tile: Tile, x: number, y: number) {
        const frame = this.tilemap.addFrame(tile.texture, tile.x, tile.y)
        const pb = this.pointsBuf
        if (!pb) return null
        tile.pointsBufIndex = pb.length - POINT_STRUCT_SIZE
        tile.setAnimation(frame)
        this.tiles[x + ';' + y] = tile
    }

    create() {
        this.tilemap = new pixi_tilemap.CompositeRectTileLayer()
        const { width, height } = this.layer.map.data
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) { 
                const tile = this.createTile(x, y)
                if (tile) {
                    this.addFrame(tile, x, y)
                }
            }
        }
        this.addChild(this.tilemap)
    }
}