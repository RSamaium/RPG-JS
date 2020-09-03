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

        this._x = Math.floor(obj.position.x)
        this._y = Math.floor(obj.position.y)

       // this._dir = obj.direction

        /*this.x = Math.floor(obj.position.x)
        this.y = obj.position.y

        console.log('draw', this.x)*/

      
        if (this._x > this.x) {
            this.x += Math.min(4, this._x - this.x)
        }

        if (this._x < this.x) {
            this.x -= Math.min(4, this.x - this._x)
        }

        if (this._y > this.y) {
            this.y += Math.min(4, this._y - this.y)
        }

        if (this._y < this.y) {
            this.y -= Math.min(4, this.y - this._y)
        }
        
    
      //  console.log(obj.position)

        this.textures = this.directions[obj.direction]

        let textureCount = this.textures.length;
        let progress = (99 - obj.progress) / 100;
        let image = Math.floor(progress * textureCount);
        this.gotoAndStop(image)
    }
}