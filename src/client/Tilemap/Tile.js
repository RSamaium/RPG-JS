import * as PIXI from 'pixi.js';

export default class Tile extends PIXI.AnimatedSprite {

    static getTextures(tile, tileSet) {
        const textures = [];

        if (tile.animations.length) {
            tile.animations.forEach(frame => {
                textures.push(tileSet.textures[frame.tileId]);
            });
        } else {
            textures.push(tileSet.textures[tile.gid - tileSet.firstGid]);
        }

        return textures;
    }

    constructor(
        tile,
        tileSet,
        horizontalFlip,
        verticalFlip,
        diagonalFlip
    ) {
        super(Tile.getTextures(tile, tileSet));

        this._x = 0
        this._y = 0
        this.gid = 0
        this.animations = []

        this.textures = Tile.getTextures(tile, tileSet);
        this.tile = tile;
        this.tileSet = tileSet;
        this.horizontalFlip = horizontalFlip;
        this.verticalFlip = verticalFlip;
        this.diagonalFlip = diagonalFlip;

        Object.assign(this, tile);

        this.flip();
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