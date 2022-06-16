import Tile from './Tile';
import { CompositeRectTileLayer, pixi_tilemap, POINT_STRUCT_SIZE } from 'pixi-tilemap'
import { TiledLayer, TiledTileset } from '@rpgjs/tiled';
import TileSet from './TileSet';
import TileMap from '.';

pixi_tilemap.Constant.maxTextures = 4
pixi_tilemap.Constant.use32bitIndex = true

export interface RpgRectTileLayer extends CompositeRectTileLayer {
    children: {
        pointsBuf: number[],
        modificationMarker: number
    }[]
}

export default class TileLayer extends PIXI.Container {
    private tilemap: RpgRectTileLayer
    properties: any
    private tiles: any = {}

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

    constructor(private layer: TiledLayer, private tileSets: TileSet[], private map: TileMap) {
        super();
        this.alpha = layer.opacity;
        Object.assign(this, layer);
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
        const gid = this.layer.data[i] as number
        if (!(
            gid &&
            gid &&
            gid !== 0
        ))  return

        const tileset = TileLayer.findTileSet(
            gid,
            this.tileSets
        )
            
        if (!tileset) return 

        const tile = new Tile(
            gid,
            tileset,
            false,
            false,
            false
        )

        tile.x = x * tilewidth;
        tile.y =
            y * tileheight +
            (tileheight -
                tile.texture.height);

        tile._x = x;
        tile._y = y;

        if (tileset.tileoffset) {
            tile.x += tileset.tileoffset.x;
            tile.y += tileset.tileoffset.y;
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
        const oldTile: Tile = this.tiles[x + ';' + y]
        const newTile = this.createTile(x, y)
        if (!oldTile && newTile) {
            this.addFrame(newTile, x, y)
        }
        else {
            if (newTile) {
                const bufComposite: RpgRectTileLayer = new pixi_tilemap.CompositeRectTileLayer() as RpgRectTileLayer
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

    /** @internal */
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

    /** @internal */
    create() {
        this.tilemap = new pixi_tilemap.CompositeRectTileLayer() as RpgRectTileLayer
        const { width, height } = this.map.getData()
        /*for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) { 
                const tile = this.createTile(x, y)
                if (tile) {
                    this.addFrame(tile, x, y)
                }
            }
        }*/
        this.addChild(this.tilemap as any)
    }
}