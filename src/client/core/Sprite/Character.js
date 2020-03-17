import * as PIXI from 'pixi.js';

export default class Character extends PIXI.AnimatedSprite {

    static createDirectionTextures(image) {
        const route = './assets'
        const { baseTexture } = PIXI.Texture.from(`${route}/${image.source}`)
        const directions = []
        const { width, height, framesHeight, framesWidth } = image
        const spriteWidth = width / framesWidth
        const spriteHeight = height / framesHeight
        for (let i = 0; i < framesHeight; i++) {
            directions[i] = []
            for (let j = 0; j < framesWidth; j++) {
                directions[i].push(
                    new PIXI.Texture(baseTexture, new PIXI.Rectangle(j * spriteWidth, i * spriteHeight, spriteWidth, spriteHeight))
                )
            }
        }
        return directions
    }

    constructor(data) {
        const directions = Character.createDirectionTextures(data.image)
        super(directions[data.direction])
        this.data = data
        this.directions = directions
    }

    load() {
        this.x = this.data.position.x
        this.y = this.data.position.y
    }

    update(obj) {

        this._x = this.x

        this.x = Math.round(obj.x)
        this.y = Math.round(obj.y)
        
        if (this.x > this._x) console.log(obj)

       //this.x += (Math.floor(Math.random() * Math.floor(2))) == 0 ? 3 : 6
        

      //  console.log(obj.position)

        this.textures = this.directions[obj.direction]

        /*let textureCount = this.textures.length;
        let progress = (99 - obj.progress) / 100;
        let image = Math.floor(progress * textureCount);
        this.gotoAndStop(image)*/
    }
}