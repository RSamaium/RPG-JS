class MockIo {
    events: Map<string, any> = new Map()

    on(name: string, value) {
        this.events.set(name, value)
    }

    off(name: string) {
        this.events.delete(name)
    }

    once(name: string, value) {
        this.on(name, value)
    }

    _trigger(name: string, data, client?) {
        const fn = this.events.get(name)
        if (fn) fn(data, client)
    }
}

class MockSocket {
    id: string

    constructor(private io: any, public handshake) {
        this.id = ''+Math.random()
    }
    
    on(name: string, value) {
        this.io.on(name, value, this.id)
        return this
    }

    once(name: string, value) {
        this.io.once(name, value, this.id)
        return this
    }

    emit(name: string, data) {
        this.io.emit(name, data, this.id)
    }

    removeAllListeners(name: string) {
        return this.off(name)
    }

    off(name: string) {
        this.io.off(name, this.id)
    }
}

class MockClientIo extends MockIo {
    id: string = ''

    connection(handshake: any) {
        serverIo.connection(this, handshake)
        this._trigger('connect', undefined)
        return this
    }

    emit(name: string, data) {
        serverIo._trigger(name, data, this)
        return this
    }

    disconnect() {
        this.emit('disconnect', undefined)
    }
}

class MockServerIo extends MockIo {
    private clients: Map<string, MockClientIo> = new Map()

    connection(client, handshake) {
        const socket = new MockSocket(this, handshake)
        this.clients.set(socket.id, client)
        client.id = socket.id
        this._trigger('connection', socket)
    }

    emit(name: string, data, id) {
        this.clients.get(id)?._trigger(name, data)
    }

    clear() {
        this.clients.clear()
    }
}

export const serverIo = new MockServerIo()
export const ClientIo = MockClientIo