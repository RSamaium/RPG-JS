import { spritesheets } from '../Sprite/Spritesheets'
import { TiledTileset, Tileset as TiledTilesetClass } from '@rpgjs/tiled'
import { log } from '../Logger'

export default class TileSet extends TiledTilesetClass {
    private baseTexture: PIXI.BaseTexture
    public textures: PIXI.Texture[] = []

    constructor(tileSet: TiledTileset) {
        super(tileSet)
    }

    /** @internal */
    load() {
        const spritesheet = spritesheets.get(this.name)
        if (!spritesheet) {
            throw log(`Impossible to find ${this.name} tileset`)
        }
        const { texture } = spritesheet.resource
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