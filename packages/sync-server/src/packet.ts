import msgpack from 'msgpack-lite'

export class Packet {
    constructor(private data: any, private roomId: string) {}

    get body() {
        return this.data
    }
    
    message(otherData: any = {}) {
        return [this.roomId, Date.now(), { ...this.data, ...otherData }]
    }

    clone(data) {
        return new Packet(data, this.roomId)
    }

    encode(otherData: any = {}) {
        return msgpack.encode(this.message(otherData))
    }
}