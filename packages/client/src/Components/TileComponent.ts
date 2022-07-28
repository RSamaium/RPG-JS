import { SceneMap } from "../Scene/Map"
import Tile from "../Tilemap/Tile"
import TileLayer from "../Tilemap/TileLayer"
import { RpgComponent } from "./Component"

export class TileComponent extends PIXI.Container {
    static readonly id: string = 'tile'

    constructor(private component: RpgComponent, private gid: number) {
        super()
        this.setTile()
    }

    setTile() {
        const scene = this.component.getScene<SceneMap>()
        const tilemap = scene.tilemap
        const tileset = TileLayer.findTileSet(
            this.gid,
            tilemap.tilesets
        )
        if (tileset) {
              const tile = new Tile({
                gid: this.gid
            } as any, tileset)
            tile.width = this.component.w
            tile.height = this.component.h
            this.addChild(tile)
        }
    }
}