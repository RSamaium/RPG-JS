import msgpack from 'msgpack-lite'

export class Packet {
    constructor(private data: any, private roomId: string) {}

    get body() {
        return this.data
    }
    
    get message() {
        return [this.roomId, Date.now(), this.data]
    }

    clone(data) {
        return new Packet(data, this.roomId)
    }

    encode() {
        return msgpack.encode(this.message)
    }
}