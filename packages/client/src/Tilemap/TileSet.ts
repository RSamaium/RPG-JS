import { spritesheets } from '../Sprite/Spritesheets'
import { log } from '../Logger'

export default class TileSet {

    firstGid: number = 0
    margin: number = 0
    spacing: number= 0
    tileHeight: number = 0
    tileWidth: number= 0
    image: {
        width: number,
        height: number
    }
    tileOffset: any = {}
    name: string = ''
    private baseTexture: PIXI.BaseTexture
    spritesheet
    private textures: PIXI.Texture[] = []

    constructor(tileSet) {
        Object.assign(this, tileSet)
        const spritesheet = spritesheets.get(this.name)
        if (!spritesheet) {
            throw log(`There are no tilesets for ${this.name}`)
        }
        this.spritesheet = spritesheet
    }

    /** @internal */
    load() {
        const { texture } = this.spritesheet.resource
        this.baseTexture = texture.baseTexture
        for (
            let y = this.margin;
            y < this.image.height;
            y += this.tileHeight + this.spacing
        ) {
            for (
                let x = this.margin;
                x < this.image.width;
                x += this.tileWidth + this.spacing
            ) {
                this.textures.push(
                    new PIXI.Texture(
                        this.baseTexture,
                        new PIXI.Rectangle(+x, +y, +this.tileWidth, +this.tileHeight)
                    )
                )
            }
        }
    }
}
