import { Texture } from "pixi.js";
import { RpgRectTileLayer } from "./TileLayer";
import TileSet from "./TileSet";
import { Tile as TiledTileClass } from '@rpgjs/tiled'

export default class Tile extends PIXI.AnimatedSprite {
    static getTextures(tile: TiledTileClass, tileSet: TileSet) {
        const textures: Texture[] = [];

        if (tile.animation && tile.animation.length) {
            tile.animation.forEach(frame => {
                textures.push(tileSet.textures[frame.tileid]);
            });
        } else {
            textures.push(tileSet.textures[tile.id - tileSet.firstgid]);
        }

        return textures;
    }

    animations: { tileId: number, duration: number }[] = []
    _x: number = 0 
    _y: number = 0
    gid: number = 0
    pointsBufIndex: number
    properties: any = {}

    constructor(
        private tile: TiledTileClass,
        private tileSet: TileSet,
        private horizontalFlip: boolean,
        private verticalFlip: boolean,
        private diagonalFlip: boolean
    ) {
        super(Tile.getTextures(tile, tileSet));

        this._x = 0
        this._y = 0
        this.gid = 0
        this.animations = []

        this.textures = Tile.getTextures(tile, tileSet);
        this.texture = this.textures[0] as Texture
        
        Object.assign(this, tile);

        this.flip()
    }

    setAnimation(frame: RpgRectTileLayer) {
        const size = this.animations.length
        if (size > 1) {
            const offest = (this.animations[1].tileId - this.animations[0].tileId) * this.width
            frame.tileAnimX(offest, size)
        }
    }

    flip() {
        if (this.horizontalFlip) {
            this.anchor.x = 1;
            this.scale.x = -1;
        }

        if (this.verticalFlip) {
            this.anchor.y = 1;
            this.scale.y = -1;
        }

        if (this.diagonalFlip) {
            if (this.horizontalFlip) {
                this.anchor.x = 0;
                this.scale.x = 1;
                this.anchor.y = 1;
                this.scale.y = 1;

                this.rotation = PIXI.DEG_TO_RAD * 90;
            }
            if (this.verticalFlip) {
                this.anchor.x = 1;
                this.scale.x = 1;
                this.anchor.y = 0;
                this.scale.y = 1;

                this.rotation = PIXI.DEG_TO_RAD * -90;
            }
        }
    }
}