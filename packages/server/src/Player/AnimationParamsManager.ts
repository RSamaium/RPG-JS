import { AnimationParamType, AnimationParams } from "@rpgjs/types";

export interface AnimationParamsManager {
}

export class AnimationParamsManager {
    animationParams: AnimationParams;

    constructor() {
        this.animationParams = {
            [AnimationParamType.ROTATION]: 0,
            [AnimationParamType.ANGLE]: 0
        }
    }

    setAnimationParam(type: AnimationParamType, value: number) {
        this.animationParams[type] = value;
    }
}
