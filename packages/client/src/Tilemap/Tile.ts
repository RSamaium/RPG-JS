export default class Tile extends PIXI.AnimatedSprite {

    static getTextures(tile, tileSet) {
        const textures: any = [];

        if (tile.animations && tile.animations.length) {
            tile.animations.forEach(frame => {
                textures.push(tileSet.textures[frame.tileId]);
            });
        } else {
            textures.push(tileSet.textures[tile.gid - tileSet.firstGid]);
        }

        return textures;
    }

    animations: { tileId: number, duration: number }[] = []
    _x: number = 0 
    _y: number = 0
    gid: number = 0
    pointsBufIndex: number
    properties: any = {}
    texture: any

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

    setAnimation(frame) {
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