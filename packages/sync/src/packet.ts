import msgpack from 'msgpack-lite'

export class Packet {
    constructor(private data: any) {}

    get body() {
        return this.data
    }

    encode() {
        return msgpack.encode(this.data)
    }
}