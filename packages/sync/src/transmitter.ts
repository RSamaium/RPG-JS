import { Packet } from './packet'

class TransmitterClass {
    private packets = {}

    addPacket(room, obj) {
        const { id } = room
        if (!this.packets[id]) this.packets[id] = []
        this.packets[id] = new Packet(obj)
    }

    forEach(cb) {
        for (let id in this.packets) {
            cb(this.packets[id], id)
        }
    }

    getPacket(room) {
       return this.packets[room.id]
    }

    clear(room?) {
        if (room) {
            this.packets[room.id] = []
        }
        else {
            this.packets = {}
        }
    }

    emit(user, packet) {
        user._socket.emit('w', packet.encode())
    }

    on(user) {
        
    }
}

export const Transmitter = new TransmitterClass()