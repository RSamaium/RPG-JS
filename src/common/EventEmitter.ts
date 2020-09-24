export class EventEmitter {
    private listeners: any = {}
    private listenersOnce: any = {}

    once(name: string, cb: Function) {
        this.listenersOnce[name] = cb
        return this
    }

    on(name: string, cb: Function) {
        if (!this.listeners[name]) this.listeners[name] = []
        this.listeners[name].push(cb)
        return this
    }

    emit(name: string, data: any) {
        if (this.listeners[name]) {
            for (let listener of this.listeners[name]) {
                listener(data)
            }
        }
        else if (this.listenersOnce[name]) {
            this.listenersOnce[name](data)
        }
    }

    off(name: string) {
        this.listeners[name] = {}
        this.listenersOnce[name] = {}
    }
}