import { isPromise } from './Utils'

export class EventEmitter {
    private listeners: {
        [eventName: string]: Function[]
    } = {}

    private listenersOnce: {
        [eventName: string]: Function
    } = {}
    
    has(name: string): boolean {
        return !!this.listeners[name] || !!this.listenersOnce[name]
    }

    once(name: string, cb: Function): EventEmitter {
        this.listenersOnce[name] = cb
        return this
    }

    on(name: string, cb: Function): EventEmitter {
        if (!this.listeners[name]) this.listeners[name] = []
        this.listeners[name].push(cb)
        return this
    }

    emit(name: string, data?: any, rest: boolean = false): Promise<any[]> {
        const ret: any = []
        if (this.listeners[name]) {
            for (let listener of this.listeners[name]) {
                if (rest) ret.push(listener(...data))
                else ret.push(listener(data))
            }
        }
        if (this.listenersOnce[name]) {
            if (rest) ret.push(this.listenersOnce[name](...data))
            else ret.push(this.listenersOnce[name](data))
        }
        return Promise.all(ret.map(val => {
            if (!isPromise(val)) {
                return Promise.resolve(val)
            }
            return val
        }))
    }

    off(name: string, listener?: Function) {
        if (!listener) {
            delete this.listeners[name]
            delete this.listenersOnce[name]
            return
        }
        if (this.listeners[name]) {
            const index = this.listeners[name].indexOf(listener)
            if (index !== -1) {
                this.listeners[name].splice(index, 1)
            }
        }
    }

    clear() {
        this.listeners = {}
        this.listenersOnce = {}
    }
}