import { Animation, Direction, Spritesheet } from '@rpgjs/client'
import { FrameOptions } from '@rpgjs/client/lib/Sprite/Spritesheet';

const getAnchor = (direction: Direction) => {
    switch (direction) {
        case Direction.Down:
            return [0, -1];
        case Direction.Up:
            return [0, 2];
        case Direction.Left:
            return [0, 0];
        case Direction.Right:
            return [2, 0];
    }
}

const anim = (direction: Direction, angle: number, rotation: number): any[][] => {
    const animation: FrameOptions[] = [{
        time: 0,
        frameX: 0,
        frameY: 0,
        angle: angle,
        anchor: getAnchor(direction),
    }];

    return [animation];
}

@Spritesheet({
    framesWidth: 1,
    framesHeight: 1,
    textures: {
        [Animation.Walk]: {
            animations: (direction, angle, rotation) => anim(direction, angle, rotation),
        },
        [Animation.Stand]: {
            animations: (direction, angle, rotation) => anim(direction, angle, rotation),
        },
    },
})
export default class BulletSpritesheets {
}
