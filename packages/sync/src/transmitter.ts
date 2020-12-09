import { Packet } from './packet'
import { RoomClass } from './interfaces/room.interface';
import { User } from './rooms/default';

class TransmitterClass {
    private packets: {
        [roomId: string]: Packet[]
    } = {}

    addPacket(room: RoomClass, obj: Object): void {
        const { id } = room
        if (!id) return
        if (!this.packets[id]) this.packets[id] = []
        this.packets[id].push(new Packet(obj))
    }

    forEach(cb: (packet: Packet[], roomId: string) => void): void {
        for (let roomId in this.packets) {
            cb(this.packets[roomId], roomId)
        }
    }

    getPackets(room: RoomClass): Packet[] | undefined {
        if (!room.id) return
        return this.packets[room.id]
    }

    clear(room?: RoomClass): void {
        if (room && room.id) {
            this.packets[room.id] = []
        }
        else {
            this.packets = {}
        }
    }

    emit(user: User, packet: Packet): void {
        user._socket.emit('w', packet.encode())
    }

    on(user) {
        
    }
}

export const Transmitter = new TransmitterClass()