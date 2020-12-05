import msgpack from 'msgpack-lite'

export class Packet {
    constructor(private data) {}

    encode() {
        return msgpack.encode(this.data)
    }
}