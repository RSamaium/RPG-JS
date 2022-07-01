import { spritesheets } from '../Sprite/Spritesheets'
import { log } from '../Logger'
import { TiledTileset, Tileset as TiledTilesetClass } from '@rpgjs/tiled'

export default class TileSet extends TiledTilesetClass {
    private baseTexture: PIXI.BaseTexture
    spritesheet
    public textures: PIXI.Texture[] = []

    constructor(tileSet: TiledTileset) {
        super(tileSet)
        
    }

    prepareImage() {
        const spritesheet = spritesheets.get(this.name)
        this.spritesheet = spritesheet
    }

    /** @internal */
    load() {
        const { texture } = this.spritesheet.resource
        this.baseTexture = texture.baseTexture
        for (
            let y = this.margin;
            y < this.image.height;
            y += this.tileheight + this.spacing
        ) {
            for (
                let x = this.margin;
                x < this.image.width;
                x += this.tilewidth + this.spacing
            ) {
                this.textures.push(
                    new PIXI.Texture(
                        this.baseTexture,
                        new PIXI.Rectangle(+x, +y, +this.tilewidth, +this.tileheight)
                    )
                )
            }
        }
    }
}