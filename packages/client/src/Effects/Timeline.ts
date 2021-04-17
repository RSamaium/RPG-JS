import { TransformOptions, FrameOptions } from '../Sprite/Spritesheet'

export const Ease = {
	linear(t: number, b: number, c: number, d: number): number {
		return c*(t/=d) + b;
	},
	easeInQuad (t: number, b: number, c: number, d: number): number {
		return c*(t/=d)*t + b;
	},
	easeOutQuad (t: number, b: number, c: number, d: number): number {
		return -c *(t/=d)*(t-2) + b;
	},
	easeInOutQuad (t: number, b: number, c: number, d: number): number {
		if ((t/=d/2) < 1) return c/2*t*t + b;
		return -c/2 * ((--t)*(t-2) - 1) + b;
	},
	easeInCubic (t: number, b: number, c: number, d: number): number {
		return c*(t/=d)*t*t + b;
	},
	easeOutCubic (t: number, b: number, c: number, d: number): number {
		return c*((t=t/d-1)*t*t + 1) + b;
	},
	easeInOutCubic (t: number, b: number, c: number, d: number): number {
		if ((t/=d/2) < 1) return c/2*t*t*t + b;
		return c/2*((t-=2)*t*t + 2) + b;
	},
	easeInQuart (t: number, b: number, c: number, d: number): number {
		return c*(t/=d)*t*t*t + b;
	},
	easeOutQuart (t: number, b: number, c: number, d: number): number {
		return -c * ((t=t/d-1)*t*t*t - 1) + b;
	},
	easeInOutQuart (t: number, b: number, c: number, d: number): number {
		if ((t/=d/2) < 1) return c/2*t*t*t*t + b;
		return -c/2 * ((t-=2)*t*t*t - 2) + b;
	},
	easeInQuint (t: number, b: number, c: number, d: number): number {
		return c*(t/=d)*t*t*t*t + b;
	},
	easeOutQuint (t: number, b: number, c: number, d: number): number {
		return c*((t=t/d-1)*t*t*t*t + 1) + b;
	},
	easeInOutQuint (t: number, b: number, c: number, d: number): number {
		if ((t/=d/2) < 1) return c/2*t*t*t*t*t + b;
		return c/2*((t-=2)*t*t*t*t + 2) + b;
	},
	easeInSine (t: number, b: number, c: number, d: number): number {
		return -c * Math.cos(t/d * (Math.PI/2)) + c + b;
	},
	easeOutSine (t: number, b: number, c: number, d: number): number {
		return c * Math.sin(t/d * (Math.PI/2)) + b;
	},
	easeInOutSine (t: number, b: number, c: number, d: number): number {
		return -c/2 * (Math.cos(Math.PI*t/d) - 1) + b;
	},
	easeInExpo (t: number, b: number, c: number, d: number): number {
		return (t==0) ? b : c * Math.pow(2, 10 * (t/d - 1)) + b;
	},
	easeOutExpo (t: number, b: number, c: number, d: number): number {
		return (t==d) ? b+c : c * (-Math.pow(2, -10 * t/d) + 1) + b;
	},
	easeInOutExpo (t: number, b: number, c: number, d: number): number {
		if (t==0) return b;
		if (t==d) return b+c;
		if ((t/=d/2) < 1) return c/2 * Math.pow(2, 10 * (t - 1)) + b;
		return c/2 * (-Math.pow(2, -10 * --t) + 2) + b;
	},
	easeInCirc (t: number, b: number, c: number, d: number): number {
		return -c * (Math.sqrt(1 - (t/=d)*t) - 1) + b;
	},
	easeOutCirc (t: number, b: number, c: number, d: number): number {
		return c * Math.sqrt(1 - (t=t/d-1)*t) + b;
	},
	easeInOutCirc (t: number, b: number, c: number, d: number): number {
		if ((t/=d/2) < 1) return -c/2 * (Math.sqrt(1 - t*t) - 1) + b;
		return c/2 * (Math.sqrt(1 - (t-=2)*t) + 1) + b;
	},
	easeInElastic (t: number, b: number, c: number, d: number): number {
		var s=1.70158;var p=0;var a=c;
		if (t==0) return b;  if ((t/=d)==1) return b+c;  if (!p) p=d*.3;
		if (a < Math.abs(c)) { a=c; var s=p/4; }
		else var s = p/(2*Math.PI) * Math.asin (c/a);
		return -(a*Math.pow(2,10*(t-=1)) * Math.sin( (t*d-s)*(2*Math.PI)/p )) + b;
	},
	easeOutElastic (t: number, b: number, c: number, d: number): number {
		var s=1.70158;var p=0;var a=c;
		if (t==0) return b;  if ((t/=d)==1) return b+c;  if (!p) p=d*.3;
		if (a < Math.abs(c)) { a=c; var s=p/4; }
		else var s = p/(2*Math.PI) * Math.asin (c/a);
		return a*Math.pow(2,-10*t) * Math.sin( (t*d-s)*(2*Math.PI)/p ) + c + b;
	},
	easeInOutElastic (t: number, b: number, c: number, d: number): number {
		var s=1.70158;var p=0;var a=c;
		if (t==0) return b;  if ((t/=d/2)==2) return b+c;  if (!p) p=d*(.3*1.5);
		if (a < Math.abs(c)) { a=c; var s=p/4; }
		else var s = p/(2*Math.PI) * Math.asin (c/a);
		if (t < 1) return -.5*(a*Math.pow(2,10*(t-=1)) * Math.sin( (t*d-s)*(2*Math.PI)/p )) + b;
		return a*Math.pow(2,-10*(t-=1)) * Math.sin( (t*d-s)*(2*Math.PI)/p )*.5 + c + b;
	},
	easeInBack (t: number, b: number, c: number, d: number, s: number): number {
		if (s == undefined) s = 1.70158;
		return c*(t/=d)*t*((s+1)*t - s) + b;
	},
	easeOutBack (t: number, b: number, c: number, d: number, s: number): number {
		if (s == undefined) s = 1.70158;
		return c*((t=t/d-1)*t*((s+1)*t + s) + 1) + b;
	},
	easeInOutBack (t: number, b: number, c: number, d: number, s: number): number {
		if (s == undefined) s = 1.70158; 
		if ((t/=d/2) < 1) return c/2*(t*t*(((s*=(1.525))+1)*t - s)) + b;
		return c/2*((t-=2)*t*(((s*=(1.525))+1)*t + s) + 2) + b;
	},
	easeInBounce (t: number, b: number, c: number, d: number): number {
		return c - Ease.easeOutBounce (d-t, 0, c, d) + b;
	},
	easeOutBounce (t: number, b: number, c: number, d: number): number {
		if ((t/=d) < (1/2.75)) {
			return c*(7.5625*t*t) + b;
		} else if (t < (2/2.75)) {
			return c*(7.5625*(t-=(1.5/2.75))*t + .75) + b;
		} else if (t < (2.5/2.75)) {
			return c*(7.5625*(t-=(2.25/2.75))*t + .9375) + b;
		} else {
			return c*(7.5625*(t-=(2.625/2.75))*t + .984375) + b;
		}
	},
	easeInOutBounce (t: number, b: number, c: number, d: number): number {
		if (t < d/2) return Ease.easeInBounce (t*2, 0, c, d) * .5 + b;
		return Ease.easeOutBounce (t*2-d, 0, c, d) * .5 + c*.5 + b;
	}
} 

type EaseType = (t: number, b: number, c: number, d: number) => number

export class Timeline {
    time: number = 0
    animation: FrameOptions[][] = []

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
     * - For a duration of 30 seconds
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
        for (let i=0 ; i < duration ; i++) {
            let anim
            const obj = {}
            for (let prop in transform) {
                const param = transform[prop]
                const cbEasing = param.easing || Ease.linear
                if (param.to < param.from) {
                    obj[prop] = 1 - cbEasing(i, param.to, param.from, duration)
                }
                else {
                    obj[prop] = cbEasing(i, param.from, param.to, duration)
                }
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