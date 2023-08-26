import { TransformOptions, FrameOptions } from '../Sprite/Spritesheet'

type EasingFunction = (time: number, _from: number, to: number, duration: number) => number;

export const Ease: Record<string, EasingFunction> = {
    linear: (time: number, _from: number, to: number, duration: number): number => {
        return _from + (to - _from) * time / duration;
    },
    easeInQuad: (time: number, _from: number, to: number, duration: number): number => {
        time /= duration;
        return (to - _from) * time * time + _from;
    },
    easeOutQuad: (time: number, _from: number, to: number, duration: number): number => {
        time /= duration;
        return -(to - _from) * time * (time - 2) + _from;
    },
    easeInOutQuad: (time: number, _from: number, to: number, duration: number): number => {
        time /= duration / 2;
        if (time < 1) return ((to - _from) / 2) * time * time + _from;
        time--;
        return -((to - _from) / 2) * (time * (time - 2) - 1) + _from;
    },
    easeInCubic: (time: number, _from: number, to: number, duration: number): number => {
        time /= duration;
        return (to - _from) * time * time * time + _from;
    },
    easeOutCubic: (time: number, _from: number, to: number, duration: number): number => {
        time /= duration;
        time--;
        return (to - _from) * (time * time * time + 1) + _from;
    },
    easeInOutCubic: (time: number, _from: number, to: number, duration: number): number => {
        time /= duration / 2;
        if (time < 1) return (to - _from) / 2 * time * time * time + _from;
        time -= 2;
        return (to - _from) / 2 * (time * time * time + 2) + _from;
    },
    easeInQuart: (time: number, _from: number, to: number, duration: number): number => {
        time /= duration;
        return (to - _from) * time * time * time * time + _from;
    },
    easeOutQuart: (time: number, _from: number, to: number, duration: number): number => {
        time /= duration;
        time--;
        return -(to - _from) * (time * time * time * time - 1) + _from;
    },
    easeInOutQuart: (time: number, _from: number, to: number, duration: number): number => {
        time /= duration / 2;
        if (time < 1) return (to - _from) / 2 * time * time * time * time + _from;
        time -= 2;
        return -(to - _from) / 2 * (time * time * time * time - 2) + _from;
    },
    easeInQuint: (time: number, _from: number, to: number, duration: number): number => {
        time /= duration;
        return (to - _from) * time * time * time * time * time + _from;
    },
    easeOutQuint: (time: number, _from: number, to: number, duration: number): number => {
        time /= duration;
        time--;
        return (to - _from) * (time * time * time * time * time + 1) + _from;
    },
    easeInOutQuint: (time: number, _from: number, to: number, duration: number): number => {
        time /= duration / 2;
        if (time < 1) return (to - _from) / 2 * time * time * time * time * time + _from;
        time -= 2;
        return (to - _from) / 2 * (time * time * time * time * time + 2) + _from;
    },
    easeInSine: (time: number, _from: number, to: number, duration: number): number => {
        return -(to - _from) * Math.cos(time / duration * (Math.PI / 2)) + (to - _from) + _from;
    },
    easeOutSine: (time: number, _from: number, to: number, duration: number): number => {
        return (to - _from) * Math.sin(time / duration * (Math.PI / 2)) + _from;
    },
    easeInOutSine: (time: number, _from: number, to: number, duration: number): number => {
        return -(to - _from) / 2 * (Math.cos(Math.PI * time / duration) - 1) + _from;
    },
    easeInExpo: (time: number, _from: number, to: number, duration: number): number => {
        return time === 0 ? _from : (to - _from) * Math.pow(2, 10 * (time / duration - 1)) + _from;
    },
    easeOutExpo: (time: number, _from: number, to: number, duration: number): number => {
        return time === duration ? to : (to - _from) * (-Math.pow(2, -10 * time / duration) + 1) + _from;
    },
    easeInOutExpo: (time: number, _from: number, to: number, duration: number): number => {
        if (time === 0) return _from;
        if (time === duration) return to;
        time /= duration / 2;
        if (time < 1) return (to - _from) / 2 * Math.pow(2, 10 * (time - 1)) + _from;
        return (to - _from) / 2 * (-Math.pow(2, -10 * --time) + 2) + _from;
    },
    easeInCirc: (time: number, _from: number, to: number, duration: number): number => {
        time /= duration;
        return -(to - _from) * (Math.sqrt(1 - time * time) - 1) + _from;
    },
    easeOutCirc: (time: number, _from: number, to: number, duration: number): number => {
        time /= duration;
        time--;
        return (to - _from) * Math.sqrt(1 - time * time) + _from;
    },
    easeInOutCirc: (time: number, _from: number, to: number, duration: number): number => {
        time /= duration / 2;
        if (time < 1) return -(to - _from) / 2 * (Math.sqrt(1 - time * time) - 1) + _from;
        time -= 2;
        return (to - _from) / 2 * (Math.sqrt(1 - time * time) + 1) + _from;
    },
    easeInElastic: (time: number, _from: number, to: number, duration: number, amplitude = 0, period = 0): number => {
        if (time === 0) return _from;
        time /= duration;
        if (time === 1) return to;
        if (period === 0) period = duration * 0.3;
        let s: number;
        if (amplitude < Math.abs(to - _from)) {
            amplitude = to - _from;
            s = period / 4;
        } else {
            s = period / (2 * Math.PI) * Math.asin((to - _from) / amplitude);
        }
        time--;
        return -(amplitude * Math.pow(2, 10 * time) * Math.sin((time * duration - s) * (2 * Math.PI) / period)) + _from;
    },
    easeOutElastic: (time: number, _from: number, to: number, duration: number, amplitude = 0, period = 0): number => {
        if (time === 0) return _from;
        time /= duration;
        if (time === 1) return to;
        if (period === 0) period = duration * 0.3;
        let s: number;
        if (amplitude < Math.abs(to - _from)) {
            amplitude = to - _from;
            s = period / 4;
        } else {
            s = period / (2 * Math.PI) * Math.asin((to - _from) / amplitude);
        }
        return amplitude * Math.pow(2, -10 * time) * Math.sin((time * duration - s) * (2 * Math.PI) / period) + (to - _from) + _from;
    },
    easeInOutElastic: (time: number, _from: number, to: number, duration: number, amplitude = 0, period = 0): number => {
        if (time === 0) return _from;
        time /= duration / 2;
        if (time === 2) return to;
        if (period === 0) period = duration * (0.3 * 1.5);
        let s: number;
        if (amplitude < Math.abs(to - _from)) {
            amplitude = to - _from;
            s = period / 4;
        } else {
            s = period / (2 * Math.PI) * Math.asin((to - _from) / amplitude);
        }
        if (time < 1) {
            time--;
            return -0.5 * (amplitude * Math.pow(2, 10 * time) * Math.sin((time * duration - s) * (2 * Math.PI) / period)) + _from;
        }
        time--;
        return amplitude * Math.pow(2, -10 * time) * Math.sin((time * duration - s) * (2 * Math.PI) / period) * 0.5 + (to - _from) + _from;
    },
    // ...

    easeInBack: (time: number, _from: number, to: number, duration: number, s = 1.70158): number => {
        time /= duration;
        return (to - _from) * time * time * ((s + 1) * time - s) + _from;
    },
    easeOutBack: (time: number, _from: number, to: number, duration: number, s = 1.70158): number => {
        time = time / duration - 1;
        return (to - _from) * (time * time * ((s + 1) * time + s) + 1) + _from;
    },
    easeInOutBack: (time: number, _from: number, to: number, duration: number, s = 1.70158): number => {
        s *= 1.525;
        time /= duration / 2;
        if (time < 1) return (to - _from) / 2 * (time * time * ((s + 1) * time - s)) + _from;
        time -= 2;
        return (to - _from) / 2 * (time * time * ((s + 1) * time + s) + 2) + _from;
    },
    easeInBounce: (time: number, _from: number, to: number, duration: number): number => {
        return (to - _from) - Ease.easeOutBounce(duration - time, 0, to - _from, duration) + _from;
    },
    easeOutBounce: (time: number, _from: number, to: number, duration: number): number => {
        time /= duration;
        let multiplier = 7.5625;
        if (time < (1 / 2.75)) {
            return (to - _from) * (multiplier * time * time) + _from;
        } else if (time < (2 / 2.75)) {
            time -= (1.5 / 2.75);
            return (to - _from) * (multiplier * time * time + 0.75) + _from;
        } else if (time < (2.5 / 2.75)) {
            time -= (2.25 / 2.75);
            return (to - _from) * (multiplier * time * time + 0.9375) + _from;
        } else {
            time -= (2.625 / 2.75);
            return (to - _from) * (multiplier * time * time + 0.984375) + _from;
        }
    },
    easeInOutBounce: (time: number, _from: number, to: number, duration: number): number => {
        if (time < duration / 2) return Ease.easeInBounce(time * 2, 0, to - _from, duration) * 0.5 + _from;
        return Ease.easeOutBounce(time * 2 - duration, 0, to - _from, duration) * 0.5 + (to - _from) * 0.5 + _from;
    }
}

type EaseType = (t: number, b: number, c: number, d: number) => number

/**
 * Creates a new instance of the Timeline class, which allows for complex animations and control over keyframes.
 * 
 * @constructor
 * @title new Timeline(options?)
 * @param {object} [options] - Optional configuration object for the Timeline.
 * @param {number} [options.keyframes=10] - Specifies the number of keyframes for the animation. Defaults to 10. The larger the keyframes, the smoother the animation, but the more resource-intensive it is, as the loop to browse the array will take longer.
 * @memberof Timeline
 * @since 4.0.0
 * @example
 * 
 * ```ts
 * const timeline = new Timeline({ keyframes: 20 });
 * ```
 */
interface TimelineOptions {
    keyframes?: number
}

export class Timeline {
    private time: number = 0
    private animation: FrameOptions[][] = []
    private keyframes: number = 10

    constructor(options?: TimelineOptions) {
        if (options) {
            if (options.keyframes) this.keyframes = options.keyframes
        }
    }

    /**
     * Allows you to create complex animations more easily. For example, to display a movement with an Easing function
     * 
     * ```ts
     * import { Timeline, Ease } from '@rpgjs/client'
     * 
     * new Timeline()
     *      .add(30, ({ scale }) => [{
     *          frameX: 0,
     *          frameY: 1,
     *          scale: [scale]
     *      }], {
     *          scale: {
     *              from: 0,
     *              to: 1,
     *              easing: Ease.easeOutBounce
     *          }
     *      })
     *      .add(100)
     *      .create()
     * ```
     * 
     * Here we say
     * 
     * - Duration in frames, allowing you to specify the duration of each animation step. If the timeline respects a specific frame rate, e.g. 60 frames per second, 40 frames correspond to an animation duration of 2/3 of a second for each step.
     * - A function that will be called every 1 frame with the `scale` property defined in transform
     * - An object of transformation. Define the properties of your choice to be passed to the callback function
     *      - `to`: the starting value
     *      - `from`: the end value
     *      - `easing`: An easing function (By default, it is a linear function)
     * 
     * Note that if you just put a duration (`add(100)`), it will only put a pause on the animation
     * 
     * Easing functions available but you can create your own
     * 
     * ```ts
     * function myEase(t: number, b: number, c: number, d: number): number { }
     * ```
     * 
     * `t`: current time
     * `b`: start value
     * `c`: end value
     * `d`: duration
     * 
     * @title Add Animation in timeline
     * @enum {Function}
     * 
     * Ease.linear | linear
    * Ease.easeInQuad | easeInQuad
    * Ease.easeOutQuad | easeOutQuad
    * Ease.easeInOutQuad | easeInOutQuad
    * Ease.easeInCubic | easeInCubic
    * Ease.easeOutCubic | easeOutCubic
    * Ease.easeInOutCubic | easeInOutCubic
    * Ease.easeInQuart | easeInQuart
    * Ease.easeOutQuart | easeOutQuart
    * Ease.easeInOutQuart | easeInOutQuart
    * Ease.easeInQuint | easeInQuint
    * Ease.easeOutQuint | easeOutQuint
    * Ease.easeInOutQuint | easeInOutQuint
    * Ease.easeInSine | easeInSine
    * Ease.easeOutSine | easeOutSine
    * Ease.easeInOutSine | easeInOutSine
    * Ease.easeInExpo | easeInExpo
    * Ease.easeOutExpo | easeOutExpo
    * Ease.easeInOutExpo | easeInOutExpo
    * Ease.easeInCirc | easeInCirc
    * Ease.easeOutCirc | easeOutCirc
    * Ease.easeInOutCirc | easeInOutCirc
    * Ease.easeInElastic | easeInElastic
    * Ease.easeOutElastic | easeOutElastic
    * Ease.easeInOutElastic | easeInOutElastic
    * Ease.easeInBack | easeInBack
    * Ease.easeOutBack | easeOutBack
    * Ease.easeInOutBack | easeInOutBack
    * Ease.easeInBounce | easeInBounce
    * Ease.easeOutBounce | easeOutBounce
     * @method timeline.add(duration,cb?,transform?)
     * @param {number} duration
     * @param { (obj?: number, time?: number) => TransformOptions[] } [cb]
     * @param { [property: string]: { to:number, from: number: easing?: Function } } [transform]
     * @returns {Timeline}
     * @memberof Timeline
     */
    add(duration: number, cb?: (obj?: any, time?: number) => TransformOptions[], transform?: {
        [property: string]: {
            to: number,
            from: number,
            easing?: EaseType
        }
    }): Timeline {
        if (!cb) {
            this.animation.push([{
                time: duration + this.time,
            }])
            this.time += duration
            return this
        }
        for (let k = 0; k < this.keyframes; k++) {
            const i = Math.floor((duration / (this.keyframes - 1)) * k)
            let anim
            const obj = {}
            for (let prop in transform) {
                const param = transform[prop]
                const cbEasing = param.easing || Ease.linear
                obj[prop] = cbEasing(i, param.from, param.to, duration)
            }
            const ret = cb(obj, i)
            anim = ret.map(el => {
                (el as any).time = i + this.time
                return el
            })
            this.animation.push(anim)
        }
        this.time += duration
        return this
    }

    /**
     * Allows you to create the animation array to assign to the `animations` property in the Spritesheet
     * 
     * ```ts
     * import { Spritesheet, Timeline } from '@rpgjs/server'
     * 
     * @Spritesheet({
     *  id: 'sprite',
     *  image: require('./sprite.png'),
     *  width: 192,
     *  height: 228,
     *  framesHeight: 6,
     *  framesWidth: 6,
     *  anchor: [0.5],
     *  textures: {
     *      myanim: {
     *          animations: new Timeline()
     *                          .add(SEE THE ADD METHOD)
     *                          .create()    
     *      }   
     *  }
     * })
     * export class MyAnim {}
     * ```
     * 
     * @title Create the animation array
     * @method timeline.create()
     * @returns {FrameOptions[][]} The animation array
     * @memberof Timeline
     */
    create(): FrameOptions[][] {
        return this.animation
    }
}