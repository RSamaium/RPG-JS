import { Serializable, BaseTypes } from 'lance-gg';

export default class TilemapSerializable extends Serializable {

    constructor(data) {
        super()
        this.data = data
        return this;
    }

    toObj() {
        const tilemap = this.data;
        return {
            width: tilemap.width,
            height: tilemap.height,
            tileWidth: tilemap.tileWidth,
            tileHeight: tilemap.tileHeight,
            layers: tilemap.layers.map(layer => {
                return {
                    type: layer.type,
                    tiles: layer.tiles.map(tile => {
                        return {
                            id: tile.id,
                            gid: tile.gid
                        }
                    }),
                    horizontalFlips: layer.horizontalFlips,
                    verticalFlips: layer.verticalFlips,
                    diagonalFlips: layer.diagonalFlips
                }
            }),
            tileSets: tilemap.tileSets.map(tileset => {
                return {
                    image: {
                        width: tileset.image.width,
                        height: tileset.image.height,
                        source: tileset.image.source
                    },
                    tileWidth: tileset.tileWidth,
                    tileHeight: tileset.tileHeight,
                    spacing: tileset.spacing,
                    margin: tileset.margin,
                    tileOffset: tileset.tileOffset,
                    tiles: tileset.tiles,
                    firstGid: tileset.firstGid
                }
            })
        }
    }
}