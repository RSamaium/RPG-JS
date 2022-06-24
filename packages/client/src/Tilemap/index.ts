import { Utils } from '@rpgjs/common'
import ImageLayer from './ImageLayer'
import TileLayer from './TileLayer'
import TileSet from './TileSet'
import Tile from './Tile'
import { log } from '../Logger'
import { TiledMap, TiledLayerType, Layer } from '@rpgjs/tiled'
import { RpgRenderer } from '../Renderer'

const { intersection } = Utils

PIXI.settings.SCALE_MODE = PIXI.SCALE_MODES.NEAREST;

export interface MapInfo extends TiledMap {
    layers: Layer[]
}

export default class TileMap extends PIXI.Container {
    background: PIXI.Graphics = new PIXI.Graphics()
    eventsLayers: {
        [eventLayerName: string]: PIXI.Container
    } = {}
    defaultLayer: PIXI.Container | null = null
    private _width: number = 0
    private _height: number = 0
    tilewidth: number = 0 
    tileheight: number = 0
    private frameRateAnimation: number = 10
    tilesets: TileSet[] = []
    layers: {
        [layerName: string]: TileLayer | ImageLayer
    } = {}
    shapeLayer: PIXI.Container = new PIXI.Container()
    private tilesLayer: PIXI.Container = new PIXI.Container()
    private frameTile: number = 0

    constructor(private data: MapInfo, private renderer: RpgRenderer) {
        super()
        this.x = 0
        this.y = 0
        this.create(data)
    }

    /** @internal */
    drawAnimateTile(frame: number) {
        if (frame % this.frameRateAnimation == 0) {
           this.renderer['renderer'].plugins.tilemap.tileAnim[0] = this.frameTile
           this.frameTile++
        }
    }

    getEventLayer(name?: string) {
        return name ? this.eventsLayers[name] : this.defaultLayer
    }

    createEventLayer(name) {
        const container = this.eventsLayers[name] = new PIXI.Container()
        container.sortableChildren = true
        this.addChild(container)
        return container
    }

    getData(): MapInfo {
        return this.data
    }

    setBackgroundColor(color: string) {
        color = color.replace('#', '')
        this.background.beginFill(parseInt(color, 16))
        this.background.drawRect(
            0,
            0,
            (this._width || 0) * (this.tilewidth || 0),
            (this._height || 0) * (this.tileheight || 0)
        );
        this.background.endFill()
    }

    private create(data: MapInfo) {
        this.data = data
        Object.assign(this, data)
        if (this.data.backgroundcolor) this.setBackgroundColor(this.data.backgroundcolor)
        this.addChild(this.background);
        this.tilesets = this.data.tilesets.map((tileSet) => {
            return new TileSet(tileSet)
        })
    }

    /** @internal */
    createOverlayTiles(x, y, instance) {
        const tilesLayer: any = []
        this.data.layers.forEach((layerData) => {
            switch (layerData.type) {
                case TiledLayerType.Tile: {
                    const tileLayer = new TileLayer(layerData, this.tilesets, this)
                    const tile = tileLayer.createTile(x, y, {
                        real: true,
                        filter: (tile: Tile) => {
                            const { data, y: yObject, z: zObject } = instance
                            const { hHitbox, height } = data
                            const zLayer = tileLayer.properties.z
                            const tileHasZ = tile.properties.z !== undefined
                            let { z } = tile.properties

                            if (zLayer !== undefined) {
                                z = zLayer + (z !== undefined ? z : 0)
                            }

                            if (z == undefined) return false 

                            const realZ = z * tile.height

                            if (zObject + height < realZ) {
                                return true
                            }

                            // player is on a tile but the player has a high z
                            if (zObject > realZ + tile.height) {
                                return false
                            }

                            if (!tileHasZ) return false 

                            // is front of tile
                            if (yObject + hHitbox > tile.y + tile.height) {
                                // if (yObject - tile.y >= height) {
                                //     return false
                                // }
                                const zIntersection = intersection([zObject, zObject + height], [realZ, realZ + tile.height])
                                if (!zIntersection) {
                                    return true
                                }
                                return false
                            }
                            return true
                        }
                    })
                    if (tile) {
                        tileLayer.addChild(tile)
                        const size = tile.animations.length
                        if (size > 0) {
                            const ms = 1000 / 60
                            tile.animationSpeed = ms / (ms * this.frameRateAnimation)
                            const frameIndex = (this.frameTile-1) - (size * Math.floor(this.frameTile / size))
                            tile.gotoAndPlay(frameIndex)
                        }
                        tilesLayer.push(tileLayer)
                    }
                    break;
                }
            }
        })
        return tilesLayer
    }

    /** @internal */
    changeTile(x: number, y: number, layerName: string) {
        const layer = this.layers[layerName]
        if (!layer) throw log(`${layerName} not exists`)
        if (layer instanceof TileLayer) {
            layer.changeTile(x, y)
        }     
    }

    /** @internal */
    load(options?: { drawTiles: boolean | undefined }) {
        this.defaultLayer = null
        this.tilesLayer.removeChildren()
        this.tilesets.forEach(tileset => tileset.load())
        this.data.layers.forEach((layerData) => {
            switch (layerData.type) {
                case TiledLayerType.Tile: {
                    const tileLayer = new TileLayer(layerData, this.tilesets, this)
                    if (options?.drawTiles) tileLayer.create()
                    this.layers[layerData.name] = tileLayer
                    this.tilesLayer.addChild(tileLayer)
                    break;
                }
                case TiledLayerType.Image: {
                    const imageLayer = new ImageLayer(layerData, this)
                    this.layers[layerData.name] = imageLayer
                    this.tilesLayer.addChild(imageLayer)
                    break;
                }
                case TiledLayerType.ObjectGroup: {
                    for (let object of layerData.objects) {
                        if (object.gid) {
                            console.log(object.gid)
                        }
                    }
                   // this.defaultLayer = this.createEventLayer(layerData.name)
                    break;
                }
            }
        })

        this.addChild(this.tilesLayer)
        if (!this.defaultLayer) {
            this.defaultLayer = this.createEventLayer('event-layer')
        }
        this.addChild(this.shapeLayer)
    }
}