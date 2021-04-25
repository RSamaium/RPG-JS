export class EventEmitter {
    private listeners: {
        [eventName: string]: Function[]
    } = {}

    private listenersOnce: {
        [eventName: string]: Function
    } = {}

    once(name: string, cb: Function): EventEmitter {
        this.listenersOnce[name] = cb
        return this
    }

    on(name: string, cb: Function): EventEmitter {
        if (!this.listeners[name]) this.listeners[name] = []
        this.listeners[name].push(cb)
        return this
    }

    emit(name: string, data?: any, rest: boolean = false): any[] {
        const ret: any = []
        if (this.listeners[name]) {
            for (let listener of this.listeners[name]) {
                if (rest) ret.push(listener(...data))
                else ret.push(listener(data))
            }
        }
        else if (this.listenersOnce[name]) {
            if (rest) ret.push(this.listenersOnce[name](...data))
            else ret.push(this.listenersOnce[name](data))
        }
        return ret
    }

    off(name: string) {
        delete this.listeners[name]
        delete this.listenersOnce[name]
    }
}