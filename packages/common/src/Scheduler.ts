import { Tick } from '@rpgjs/types';
import { BehaviorSubject, Observable } from 'rxjs';
import { EventEmitter } from './EventEmitter';
import Utils from './Utils';

export class Scheduler extends EventEmitter {
    private maxFps?: number
    private fps: number = 60
    private deltaTime: number = 0
    public frame: number = 0
    private timestamp: number = 0
    private requestedDelay: number = 0
    private lastTimestamp: number = 0
    private _tick: BehaviorSubject<Tick> = new BehaviorSubject({
        timestamp: 0,
        deltaTime: 0,
        frame: 0,
        deltaRatio: 0
    })
    private _stop: boolean = false

    get tick(): Observable<Tick> {
        return this._tick.asObservable()
    }

    nextTick(timestamp: number) {
        this.lastTimestamp = this.lastTimestamp || this.timestamp // first
        this.deltaTime =  Utils.preciseNow() - this.timestamp
        this.timestamp = timestamp
        this._tick.next({
            timestamp: this.timestamp,
            deltaTime: this.deltaTime,
            frame: this.frame,
            deltaRatio: ~~this.deltaTime / ~~Utils.fps2ms(this.fps)
        })
        this.lastTimestamp = this.timestamp
        this.frame++
    }

    /**
     * start the schedule
     * @return {Scheduler} returns this scheduler instance
     */
    start(options: {
        maxFps?: number
        fps?: number,
        delay?: number
    }) {
        if (options.maxFps) this.maxFps = options.maxFps
        if (options.fps) this.fps = options.fps
        if (options.delay) this.requestedDelay = options.delay
        const requestAnimationFrame = (fn: (timestamp: number) => void) => {
            if (Utils.isBrowser()) {
                window.requestAnimationFrame(fn.bind(this))
            }
            else {
                setTimeout(() => {
                    this.requestedDelay = 0
                    fn(Utils.preciseNow())
                }, Utils.fps2ms(this.fps) + this.requestedDelay)
            }
        }

        if (!this.maxFps) {
            const loop = (timestamp: number) => {
                requestAnimationFrame(loop)
                this.nextTick(timestamp)
            }
            requestAnimationFrame(loop)
        }
        else {
            const msInterval = Utils.fps2ms(this.maxFps)
            let now = Utils.preciseNow()
            let then = Utils.preciseNow()
            const loop = (timestamp: number) => {
                if (this._stop) return
                requestAnimationFrame(loop)
                now = Utils.preciseNow()
                const elapsed = now - then
                if (elapsed > msInterval) {
                    then = now - (elapsed % msInterval)
                    this.nextTick(timestamp)
                }
            }
            requestAnimationFrame(loop)
        }

        return this;
    }

    stop() {
        this._stop = true
        this._tick.complete()
    }
}
