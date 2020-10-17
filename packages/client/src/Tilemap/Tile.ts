import * as PIXI from 'pixi.js';

export default class Tile extends PIXI.AnimatedSprite {

    static getTextures(tile, tileSet) {
        const textures: any = [];

        if (tile.animations.length) {
            tile.animations.forEach(frame => {
                textures.push(tileSet.textures[frame.tileId]);
            });
        } else {
            textures.push(tileSet.textures[tile.gid - tileSet.firstGid]);
        }

        return textures;
    }

    animations: any[] = []
    _x: number = 0 
    _y: number = 0
    gid: number = 0

    constructor(
        private tile,
        private tileSet,
        private horizontalFlip,
        private verticalFlip,
        private diagonalFlip
    ) {
        super(Tile.getTextures(tile, tileSet));

        this._x = 0
        this._y = 0
        this.gid = 0
        this.animations = []

        this.textures = Tile.getTextures(tile, tileSet);
        this.texture = this.textures[0]
        
        Object.assign(this, tile);

        this.flip()
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