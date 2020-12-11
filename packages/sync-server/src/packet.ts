import msgpack from 'msgpack-lite'

export class Packet {
    constructor(private data: any, private roomId: string) {}

    get body() {
        return this.data
    }

    encode() {
        return msgpack.encode([this.roomId, this.data])
    }
}