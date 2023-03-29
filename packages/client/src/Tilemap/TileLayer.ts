import Tile from './Tile';
import { CompositeTilemap, settings, POINT_STRUCT_SIZE, Tilemap } from '@pixi/tilemap'
import { Layer, Tile as TileClass } from '@rpgjs/tiled';
import TileSet from './TileSet';
import TileMap from '.';
import { CommonLayer } from './CommonLayer';

settings.use32bitIndex = true

export default class TileLayer extends CommonLayer {
    private tilemap: CompositeTilemap
    private _tiles: any = {}
    tiles: (TileClass | null)[]

    static findTileSet(gid: number, tileSets: TileSet[]) {
        let tileset: TileSet | undefined
        for (let i = tileSets.length - 1; i >= 0; i--) {
            tileset = tileSets[i]
            if (tileset.firstgid && tileset.firstgid <= gid) {
                break;
            }
        }
        return tileset;
    }

    constructor(layer: Layer, private tileSets: TileSet[], map: TileMap) {
        super(layer, map)
    }

    /** @internal */
    createTile(x: number, y: number, options: any = {}): Tile | undefined {
        const { real, filter } = options
        const { width, tilewidth, tileheight } = this.map.getData()
        if (real) {
            x = Math.floor(x / tilewidth)
            y = Math.floor(y / tileheight)
        }
        const i = x + y * width;
        const tiledTile = this.layer.getTileByIndex(i)

        if (!tiledTile || (tiledTile && tiledTile.gid == 0)) return

        const tileset = TileLayer.findTileSet(
            tiledTile.gid,
            this.tileSets
        )

        if (!tileset) return

        const tile = new Tile(
            tiledTile,
            tileset
        )

        tile.x = x * tilewidth;
        tile.y =
            y * tileheight +
            (tileheight -
                tile.texture.height);

        tile._x = x;
        tile._y = y;

        if (tileset.tileoffset) {
            tile.x += tileset.tileoffset.x ?? 0;
            tile.y += tileset.tileoffset.y ?? 0;
        }

        if (filter) {
            const ret = filter(tile)
            if (!ret) return
        }
        return tile
    }

    /** @internal */
    changeTile(x: number, y: number) {
        const { tilewidth, tileheight } = this.map.getData()
        x = Math.floor(x / tilewidth)
        y = Math.floor(y / tileheight)
        const oldTile: Tile = this._tiles[x + ';' + y]
        const newTile = this.createTile(x, y)
        if (!oldTile && newTile) {
            this.addFrame(newTile, x, y)
        }
        else {
            if (newTile) {
                const bufComposite: CompositeTilemap = new CompositeTilemap()
                const frame = bufComposite.tile(newTile.texture, newTile.x, newTile.y)
                newTile.setAnimation(frame)
                this._tiles[x + ';' + y] = newTile
                // @ts-ignore
                const pointsBufComposite = (bufComposite.children[0]  as Tilemap).pointsBuf
                    // Change Texture (=0, 1 and 7, rotate (=4), animX (=5), animY (=6))
                    ;[0, 1, 4, 6, 7, 8].forEach((i) => {
                        if (this.pointsBuf) this.pointsBuf[oldTile.pointsBufIndex + i] = pointsBufComposite[i]
                    })
                // @ts-ignore
                this.tilemap.children[0].modificationMarker = 0
                this.addFrame(newTile, x, y)
                this['modificationMarker'] = 0
            }
            else {
                delete this._tiles[x + ';' + y]
                if (this.pointsBuf) this.pointsBuf.splice(oldTile.pointsBufIndex, POINT_STRUCT_SIZE)
            }
        }
    }

    /** @internal */
    get pointsBuf(): number[] | null {
        const child = this.tilemap.children[0] as Tilemap
        if (!child) return null
        return child['pointsBuf']
    }

    private addFrame(tile: Tile, x: number, y: number) {
        const frame = this.tilemap.tile(tile.texture, tile.x, tile.y, {
            rotate: tile.texture.rotate
        })
        const pb = this.pointsBuf
        if (!pb) return null
        tile.pointsBufIndex = pb.length - POINT_STRUCT_SIZE
        tile.setAnimation(frame)
        this._tiles[x + ';' + y] = tile
    }

    /** @internal */
    create() {
        this.tilemap = new CompositeTilemap()
        const { width, height } = this.map.getData()
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const tile = this.createTile(x, y)
                if (tile) {
                    this.addFrame(tile, x, y)
                }
            }
        }
        this.addChild(this.tilemap as any)
    }
}