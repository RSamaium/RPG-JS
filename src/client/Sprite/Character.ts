import * as PIXI from 'pixi.js';
import { spritesheets } from './Spritesheets'

export default class Character extends PIXI.Sprite {

    static createDirectionTextures(spritesheet) {
        const { baseTexture } = PIXI.Texture.from(spritesheet.image)
        const directions: any = []
        const { width, height, framesHeight, framesWidth } = spritesheet
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

    private direction: number = 0
    private directions: any = []
    private progressAnimation: number  = 0
    private graphic: string = ''
    private spritesheet: any
    private _x: number = 0
    private _y: number = 0

    constructor(private data: any) {
        super()
        this.x = data.x 
        this.y = data.y
    }

    setGraphic() {
        this.spritesheet = spritesheets.get(this.graphic)
        this.origin()
        this.directions = Character.createDirectionTextures(this.spritesheet)
        this.gotoAndStop(0)
    }

    origin() {
        if (!this.spritesheet) {
            return
        }
        const data = this.data
        const { width, height, framesWidth, framesHeight } = this.spritesheet
        const w = 1 - (data.width / (width / framesWidth))
        const h = 1 - (data.height / (height / framesHeight))
        this.anchor.set(w, h)
    }

    load() {
        this.x = this.data.position.x
        this.y = this.data.position.y
    }

    gotoAndStop(index) {
        if (this.directions[this.direction]) this.texture = this.directions[this.direction][index]
    }

    update(obj) {

        if (obj.graphic != this.graphic) {
            this.graphic = obj.graphic
            this.setGraphic()
        }

        const speed = obj.speed + (obj.speed / 3)

        let moving = false

        this._x = Math.floor(obj.position.x)
        this._y = Math.floor(obj.position.y)

        obj.posX = obj.position.x
        obj.posY = obj.position.y

        this.direction = obj.direction
        this.zIndex = this._y
      
        if (this._x > this.x) {
            this.x += Math.min(speed, this._x - this.x)
            moving = true
        }

        if (this._x < this.x) {
            this.x -= Math.min(speed, this.x - this._x)
            moving = true
        }

        if (this._y > this.y) {
            this.y += Math.min(speed, this._y - this.y)
            moving = true
        }

        if (this._y < this.y) {
            this.y -= Math.min(speed, this.y - this._y)
            moving = true
        }

        if (moving) {
            this.progressAnimation += 3
            let textureCount = 4;
            if (this.progressAnimation >= 100) {
                this.progressAnimation = 0
            }
            let progress = (99 - this.progressAnimation) / 100;
            let image = Math.floor(progress * textureCount)
            this.gotoAndStop(image)
        }
        else {
            this.gotoAndStop(0)
        }
         
    }
}