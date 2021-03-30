import { RpgSprite } from '@rpgjs/client'

export class Sprite extends RpgSprite {

    hitbox: PIXI.Graphics = new PIXI.Graphics()

    onChanges(data, old) { 
        if (data.wHitbox && data.hHitbox) {
            this.hitbox.beginFill(0xFF0000);
            this.hitbox.drawRect(0, 0, data.wHitbox, data.hHitbox);
            this.hitbox.endFill();
            this.addChild(this.hitbox)
        } 
    }
}