import { TileComponentObject } from "@rpgjs/types"
import { SceneMap } from "../Scene/Map"
import Tile from "../Tilemap/Tile"
import TileLayer from "../Tilemap/TileLayer"
import { AbstractComponent, CellInfo } from "./AbstractComponent"
import { RpgComponent } from "./Component"

export class TileComponent extends AbstractComponent<TileComponentObject, PIXI.Container> {
    static readonly id: string = 'tile'
    cacheParams: string[] = []
    gid: number = 0

    onInit(cell: CellInfo) {
        if (typeof this.value == 'number') {
            this.gid = this.value
        } else {
            this.gid = this.value.gid
        }
        this.updateRender({})
        super.onInit(cell)
    }

    updateRender(object: any) {
        this.removeChildren()
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
            tile.width = this.cell?.width ?? 0
            tile.height = this.cell?.height ?? 0
            this.addChild(tile)
        }
    }
}