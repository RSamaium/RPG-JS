import { TiledLayer } from "../types/Layer";
import { TiledMap } from "../types/Map";
import { Layer } from "./Layer";
import { TiledObjectClass } from "./Object";
import { TiledProperties } from "./Properties";
import { Tileset } from "./Tileset";

export class MapClass extends TiledProperties {
    tilesets: Tileset[] = []
    layers: Layer[] = []
    private tmpLayers: Layer[] = [] 

    constructor(map?: TiledMap) {
        super(map ?? {})
        if (map) this.load(map)
    }

    load(map: TiledMap) {
        Object.assign(this, map)
        this.mapTilesets()
        this.mapLayers(this.layers)
        this.layers = this.tmpLayers
        Reflect.deleteProperty(this, 'tmpLayers')
    }

    get widthPx(): number {
        return this.width * this.tilewidth
    }

    get heightPx(): number {
        return this.height * this.tileheight
    }

    getLayerByName(name: string): TiledLayer | undefined {
        return this.layers.find(layer => layer.name == name)
    }

    getTileIndex(x: number, y: number, [z] = [0]): number {
        return this.width * Math.floor((y - z) / this.tileheight) + Math.floor(x / this.tilewidth)
    }

    getTileOriginPosition(x: number, y: number): {
        x: number
        y: number
    } {
        return { 
            x: Math.floor(x / this.tilewidth) * this.tilewidth,
            y: Math.floor(y / this.tileheight) * this.tileheight
        }
    }

    getAllObjects(): TiledObjectClass[]  {
        return this.layers.reduce((prev: TiledObjectClass[], current: Layer) => {
            if (!current.objects) return prev
            return prev.concat(...current.objects)
        }, [])
    }

    private mapTilesets() {
        this.tilesets = this.tilesets.map(tileset => new Tileset(tileset))
    }

    private mapLayers(layers: TiledLayer[] = []) {
        for (let layer of layers) {
            this.tmpLayers.push(new Layer(layer, this.tilesets))
            if (layer.layers) {
                this.mapLayers(layer.layers)
            }
        }
    }
}

export interface MapClass extends TiledMap {}