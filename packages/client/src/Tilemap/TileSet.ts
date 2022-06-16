import { spritesheets } from '../Sprite/Spritesheets'
import { log } from '../Logger'
import { TiledTileset } from '@rpgjs/tiled'

export default class TileSet {
    firstgid: number = 0
    margin: number = 0
    spacing: number= 0
    tileheight: number = 0
    tilewidth: number= 0
    image: {
        width: number,
        height: number
    }
    tileoffset: any = {}
    name: string = ''
    private baseTexture: PIXI.BaseTexture
    spritesheet
    private textures: PIXI.Texture[] = []

    constructor(tileSet: TiledTileset) {
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
