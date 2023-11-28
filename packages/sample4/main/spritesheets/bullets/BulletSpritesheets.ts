import { Animation, Direction, Spritesheet } from '@rpgjs/client'
import { AnimationParamType, AnimationParams } from '@rpgjs/types';

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

const anim = (direction: Direction, params: AnimationParams): any[][] => {
    const animation: any[] = [{
        time: 0,
        frameX: 0,
        frameY: 0,
        angle: params[AnimationParamType.ANGLE],
    }];

    return [animation];
}

@Spritesheet({
    framesWidth: 1,
    framesHeight: 1,
    textures: {
        [Animation.Walk]: {
            animations: (direction, params) => anim(direction, params),
        },
        [Animation.Stand]: {
            animations: (direction, params) => anim(direction, params),
        },
    },
})
export default class BulletSpritesheets {
}
