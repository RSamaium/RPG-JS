import { Utils } from '@rpgjs/common'
import ImageLayer from './ImageLayer'
import TileLayer from './TileLayer'
import TileSet from './TileSet'
import Tile from './Tile'
import { log } from '../Logger'

const { intersection } = Utils

PIXI.settings.SCALE_MODE = PIXI.SCALE_MODES.NEAREST;

export default class TileMap extends PIXI.Container {

    background: PIXI.Graphics = new PIXI.Graphics()
    eventsLayers: any = {}
    defaultLayer: any = null
    data
    _width: number = 0
    _height: number = 0
    tileWidth: number = 0 
    tileHeight: number = 0
    frameRateAnimation: number = 10
    tileSets: any[] = []
    layers: any = {}
    shapeLayer: PIXI.Container = new PIXI.Container()
    tilesLayer: PIXI.Container = new PIXI.Container()
    private frameTile: number = 0

    constructor(data, private renderer) {
        super()
        this.x = 0
        this.y = 0
        this.create(data)
    }

    drawAnimateTile(frame: number) {
        if (frame % this.frameRateAnimation == 0) {
            this.renderer.renderer.plugins.tilemap.tileAnim[0] = this.frameTile
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

    private create(data) {
        this.data = data
        Object.assign(this, data)

        this.background.beginFill(0x00000);
        this.background.drawRect(
            0,
            0,
            (this._width || 0) * (this.tileWidth || 0),
            (this._height || 0) * (this.tileHeight || 0)
        );
        this.background.endFill();
        this.addChild(this.background);

        this.tileSets = this.tileSets.map((tileSet) => {
            return new TileSet(tileSet)
        })
    }

    createOverlayTiles(x, y, instance) {
        const tilesLayer: any = []
        this.data.layers.forEach((layerData) => {
            switch (layerData.type) {
                case 'tile': {
                    const tileLayer = new TileLayer(layerData, this.tileSets)
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

    changeTile(x: number, y: number, layerName: string) {
        if (!this.layers[layerName]) throw log(`${layerName} not exists`)
        this.layers[layerName].changeTile(x, y)
    }

    load() {
        this.defaultLayer = null
        this.tilesLayer.removeChildren()
        
        this.tileSets.forEach(tileset => tileset.load())

        this.data.layers.forEach((layerData) => {
            layerData.map = this
            switch (layerData.type) {
                case 'tile': {
                    const tileLayer = new TileLayer(layerData, this.tileSets)
                    tileLayer.create()
                    this.layers[layerData.name] = tileLayer
                    this.tilesLayer.addChild(tileLayer)
                    break;
                }
                case 'image': {
                    const imageLayer = new ImageLayer(layerData, /** TODO */ null);
                    this.layers[layerData.name] = imageLayer
                    this.tilesLayer.addChild(imageLayer)
                    break;
                }
                case 'object': {
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