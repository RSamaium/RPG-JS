import { RpgSprite, RpgSound } from '@rpgjs/client'


export class Sprite extends RpgSprite {

    hitbox: PIXI.Graphics = new PIXI.Graphics()
    visionHitbox: PIXI.Graphics = new PIXI.Graphics()

    onInit() {
        this.interactive = true
        this.on('pointerdown', (ev) => {
            
        });
    }

    onChanges(data, old) { 
        /*if (data.wHitbox && data.hHitbox) {
            this.hitbox.beginFill(0xFF0000);
            this.hitbox.drawRect(0, 0, data.wHitbox, data.hHitbox);
            this.hitbox.endFill();
            this.addChild(this.hitbox)
        }
        if (data.vision) {
            this.visionHitbox.beginFill(0x00FF00);
            const x = data.vision.width / 2 - old.hitbox.w / 2
            const y = data.vision.height / 2 - old.hitbox.h / 2
            this.visionHitbox.drawRect(-x, -y, data.vision.width, data.vision.height);
            this.visionHitbox.endFill();
            this.addChild(this.visionHitbox)
        } */
    }
}