class MockIo {

    events: Map<string, any> = new Map()

    on(name, value) {
        this.events.set(name, value)
    }

    once(name, value) {
        this.on(name, value)
    }

    _trigger(name, data, client?) {
        const fn = this.events.get(name)
        if (fn) fn(data, client)
    }
}

class MockSocket {

    id: string

    constructor(private io: any) {
        this.id = ''+Math.random()
    }
    
    on(name, value) {
        this.io.on(name, value, this.id)
        return this
    }
    emit(name, data) {
        this.io.emit(name, data, this.id)
    }
}

class MockClientIo extends MockIo {
    id: string = ''
    connection() {
        serverIo.connection(this)
        return this
    }
    emit(name, data) {
        serverIo._trigger(name, data, this)
        return this
    }
}

class MockServerIo extends MockIo {
    private clients: Map<string, MockClientIo> = new Map()
    connection(client) {
        const socket = new MockSocket(this)
        this.clients.set(socket.id, client)
        client.id = socket.id
        this._trigger('connection', socket)
    }
    emit(name, data, id) {
        this.clients.get(id)?._trigger(name, data)
    }
}

export const serverIo = new MockServerIo()
export const ClientIo = MockClientIo