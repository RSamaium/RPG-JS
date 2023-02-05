import { Texture, AnimatedSprite } from "pixi.js";
import { RpgRectTileLayer } from "./TileLayer";
import TileSet from "./TileSet";
import { Tile as TiledTileClass } from '@rpgjs/tiled'

export default class Tile extends AnimatedSprite {
    static getTextures(tile: TiledTileClass, tileSet: TileSet) {
        const textures: Texture[] = [];

        if (tile.animations && tile.animations.length) {
            tile.animations.forEach(frame => {
                textures.push(tileSet.textures[frame.tileid].clone())
            });
        } else {
            textures.push(tileSet.textures[tile.gid - tileSet.firstgid].clone())
        }

        return textures;
    }

    animations: { tileid: number, duration: number }[] = []
    _x: number = 0 
    _y: number = 0
    pointsBufIndex: number
    properties: any = {}

    constructor(
        private tile: TiledTileClass,
        private tileSet: TileSet
    ) {
        super(Tile.getTextures(tile, tileSet));
        this.animations = tile.animations || []
        this.properties = tile.properties
        this.textures = Tile.getTextures(tile, tileSet)
        this.texture = this.textures[0] as Texture
        this.flip()
    }

    get gid() {
        return this.tile.gid
    }

    setAnimation(frame: RpgRectTileLayer) {
        const size = this.animations.length
        if (size > 1) {
            const offest = (this.animations[1].tileid - this.animations[0].tileid) * this.width
            frame.tileAnimX(offest, size)
        }
    }

    flip() {
        let symmetry
        let i=0
        const add = (symmetrySecond) => {
            i++
            if (symmetry) symmetry = PIXI.groupD8.add(symmetry, symmetrySecond)
            else symmetry = symmetrySecond    
        }

        if (this.tile.horizontalFlip) {
            add(PIXI.groupD8.MIRROR_HORIZONTAL)
        }

        if (this.tile.verticalFlip) {
            add(PIXI.groupD8.MIRROR_VERTICAL)
        }

        if (this.tile.diagonalFlip) {
            if (i % 2 == 0) {
                add(PIXI.groupD8.MAIN_DIAGONAL)
            }
            else {
                add(PIXI.groupD8.REVERSE_DIAGONAL)
            }
        }

        if (symmetry) this.texture.rotate = symmetry
        
    }
}