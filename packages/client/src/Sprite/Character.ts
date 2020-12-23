import * as PIXI from 'pixi.js';
import { spritesheets } from './Spritesheets'
import { FloatingText } from '../Effects/FloatingText'

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

    tilesOverlay: any
    private direction: number = 0
    private directions: any = []
    private progressAnimation: number  = 0
    private graphic: string = ''
    private spritesheet: any
    private _x: number = 0
    private _y: number = 0
    public z: number = 0
    private effects: any[] = []
    private fixed: boolean = false

    constructor(private data: any, private scene: any) {
        super()
        this.x = data.x 
        this.y = data.y
        this.fixed = data.fixed
    }

    addEffect(str) {
        const id = Math.random()
        const text = new FloatingText(str, {
            fontFamily : 'Arial', 
            fontSize: 50, 
            fill : 0xffffff, 
            align : 'center',
            stroke: 'black',
            letterSpacing: 4,
            strokeThickness: 3
        })
        text['id'] = id
        this.addChild(text)
        text.run().then(() => {
            const index = this.effects.findIndex(effect => effect['id'] == id)
            this.effects.splice(index, 1)
            this.removeChild(text)
        })
        this.effects.push(text)
    }

    setGraphic() {
        this.spritesheet = spritesheets.get(this.graphic)
        this.origin() 
        this.directions = Character.createDirectionTextures(this.spritesheet)
        this.gotoAndStop(0)
        if (this.onSetGraphic) this.onSetGraphic(this.spritesheet)
    }

    getSpriteAnimation(name) {
        // not graphic yet
        if (!this.spritesheet) return 
        if (!this.spritesheet.action) return 0
        return this.spritesheet.action[name] || 0
    }

    origin() {
        if (!this.spritesheet) {
            return
        }
        const data = this.data
        if (!data.wHitbox || !data.hHitbox) return
        const { width, height, framesWidth, framesHeight } = this.spritesheet
        const w = 1 - (data.wHitbox / (width / framesWidth))
        const h = 1 - (data.hHitbox / (height / framesHeight))
        this.anchor.set(w, h)
    }

    load() {
        this.x = this.data.position.x
        this.y = this.data.position.y
    }

    gotoAndStop(index) {
        if (this.directions[this.direction]) this.texture = this.directions[this.direction][index]
    }

    update(obj): any {

        const { graphic, speed } = obj

        if (graphic != this.graphic) {
            this.graphic = graphic
            this.setGraphic()
        }

        for (let effect of this.effects) {
            effect.update(obj)
        }

        let moving = false
        let textureCount = 4

        if (!this.fixed) {
            this.z = Math.floor(obj.position.z)
            this._x = Math.floor(obj.position.x)
            this._y = Math.floor(obj.position.y) - this.z

            this.parent.zIndex = this._y
     
            obj.posX = obj.position.x
            obj.posY = obj.position.y
    
            this.direction = obj.direction

            // If the positions coming from the server are too different from the client, we reposition the player.
            if (Math.abs(this._x - this.x) > speed * 15) this.x = this._x
            if (Math.abs(this._y - this.y) > speed * 15) this.y = this._y
          
            if (this._x > this.x) {
                this.x += Math.min(speed, this._x - this.x)
                if (this.spritesheet) textureCount = this.spritesheet.framesWidth
                moving = true
            }
    
            if (this._x < this.x) {
                this.x -= Math.min(speed, this.x - this._x)
                if (this.spritesheet) textureCount = this.spritesheet.framesWidth
                moving = true
            }
    
            if (this._y > this.y) {
                this.y += Math.min(speed, this._y - this.y)
                if (this.spritesheet) textureCount = this.spritesheet.framesWidth
                moving = true
            }
    
            if (this._y < this.y) {
                this.y -= Math.min(speed, this.y - this._y)
                if (this.spritesheet) textureCount = this.spritesheet.framesWidth
                moving = true
            }
        }

        if (moving) {
            this.progressAnimation += 5
            if (this.progressAnimation >= 100) {
                this.progressAnimation = 0
            }
            let progress = (99 - this.progressAnimation) / 100;
            let image = Math.floor(progress * textureCount)
            this.gotoAndStop(image)
        }
        else {
            this.gotoAndStop(this.getSpriteAnimation('stand'))
        }

        return {
            moving,
            instance: this
        }
         
    }

    onSetGraphic(spritesheet) {}
}