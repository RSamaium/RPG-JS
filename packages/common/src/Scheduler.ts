import { EventEmitter } from './EventEmitter';

const SIXTY_PER_SEC = 1000 / 60;
const LOOP_SLOW_THRESH = 0.3;
const LOOP_SLOW_COUNT = 10;

/**
 * Scheduler class
 *
 */
export class Scheduler extends EventEmitter {

    nextExecTime
    requestedDelay: number
    delayCounter: number
    timestamp: number = 0
    lastTimestamp: number = 0
    deltaTime: number = 0
    deltaTimeInt: number = 0
    frame: number = 0

    /**
     * schedule a function to be called
     *
     * @param {Object} options the options
     * @param {Function} options.tick the function to be called
     * @param {Number} options.period number of milliseconds between each invocation, not including the function's execution time
     * @param {Number} options.delay number of milliseconds to add when delaying or hurrying the execution
     */
    constructor(private options: { 
        tick: Function,
        period: number, 
        delay: number, 
        stepPeriod?: number 
    }) {
        super()
        this.options = Object.assign({
            tick: null,
            period: SIXTY_PER_SEC,
            delay: SIXTY_PER_SEC / 3
        }, options);
        this.nextExecTime = null;
        this.requestedDelay = 0;
        this.delayCounter = 0;
    }

    // in same cases, setTimeout is ignored by the browser,
    // this is known to happen during the first 100ms of a touch event
    // on android chrome.  Double-check the game loop using requestAnimationFrame
    nextTickChecker() {
        let currentTime = (new Date()).getTime();
        if (currentTime > this.nextExecTime) {
            this.delayCounter++;
            this.callTick();
            this.nextExecTime = currentTime + (this.options.stepPeriod || 0);
        }
        window.requestAnimationFrame(this.nextTickChecker.bind(this));
    }

    nextTick() {
        const now = (new Date()).getTime()
        this.deltaTime = now - this.timestamp 
        this.frame++
        this.deltaTimeInt = Math.round(this.deltaTime / this.options.period)
        this.timestamp = now;
        if (this.timestamp > this.nextExecTime + this.options.period * LOOP_SLOW_THRESH) {
            this.delayCounter++;
        } else
            this.delayCounter = 0;

        this.callTick();
        this.nextExecTime = this.timestamp + this.options.period + this.requestedDelay;
        this.requestedDelay = 0;
        setTimeout(this.nextTick.bind(this), this.nextExecTime - (new Date()).getTime());
    }

    callTick() {
        if (this.delayCounter >= LOOP_SLOW_COUNT) {
            //console.warn('[RPGJS] Warning, Event Loop is slow !')
            this.delayCounter = 0;
        }
        this.options.tick(this.timestamp, this.deltaTime);
    }

    /**
     * start the schedule
     * @return {Scheduler} returns this scheduler instance
     */
    start() {
        setTimeout(this.nextTick.bind(this));
        if (typeof window === 'object' && typeof window.requestAnimationFrame === 'function')
            window.requestAnimationFrame(this.nextTickChecker.bind(this));
        return this;
    }

    /**
     * delay next execution
     */
    delayTick() {
        this.requestedDelay += this.options.delay;
    }

    /**
     * hurry the next execution
     */
    hurryTick() {
        this.requestedDelay -= this.options.delay;
    }
}
