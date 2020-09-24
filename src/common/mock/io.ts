class MockIo {

    events: Map<string, any> = new Map()

    on(name, value) {
        this.events.set(name, value)
    }

    once(name, value) {
        this.on(name, value)
    }

    _trigger(name, data) {
        const fn = this.events.get(name)
        if (fn) fn(data)
    }
}

class MockSocket {

    id: string = 'id'

    constructor(private io: any) {}
    
    on(name, value) {
        this.io.on(name, value)
        return this
    }
    emit(name, data) {
        this.io.emit(name, data)
    }
}

class MockClientIo extends MockIo {
   connection() {
        serverIo.connection()
        return this
   }
   emit(name, data) {
        serverIo._trigger(name, data)
        return this
    }
}

class MockServerIo extends MockIo {
    connection() {
       this._trigger('connection', new MockSocket(this))
    }
    emit(name, data) {
        clientIo._trigger(name, data)
    }
}

export const clientIo = new MockClientIo()
export const serverIo = new MockServerIo()