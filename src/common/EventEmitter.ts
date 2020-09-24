export class EventEmitter {
    private listeners: any = {}

    on(name: string, cb: Function) {
        this.listeners[name] = cb
        return this
    }

    emit(name: string, data: any) {
        if (this.listeners[name]) {
            this.listeners[name](data)
        }
    }
}