import { Animation } from '../Effects/AnimationCharacter'

export const RMSpritesheet = (framesWidth, framesHeight, frameStand = 1) => {

    const stand = frameY => [{ time: 0, frameX: frameStand, frameY }]
    const walk = frameY => {
        const array: any = []
        for (let i=0 ; i < framesWidth ; i++) {
            array.push({ time: i*10,  frameX: i, frameY })
        }
        return array
    }

    return {
        animations:  {
            [Animation.StandDown]: [stand(0)],
            [Animation.StandUp]: [stand(3)],
            [Animation.StandRight]: [stand(2)],
            [Animation.StandLeft]: [stand(1)],
            [Animation.WalkDown]: [walk(0)],
            [Animation.WalkRight]: [walk(2)],
            [Animation.WalkLeft]: [walk(1)],
            [Animation.WalkUp]: [walk(3)]
        },
        framesHeight,
        framesWidth
    }
}
