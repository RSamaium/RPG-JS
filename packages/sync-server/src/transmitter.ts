import { Packet } from './packet'
import { RoomClass } from './interfaces/room.interface';
import { User } from './rooms/default';

class TransmitterClass {
    
    public encode: boolean = true
    
    private packets: {
        [roomId: string]: Packet[]
    } = {}

    addPacket(room: RoomClass, obj: Object): void {
        const { id } = room
        if (!id) return
        if (!this.packets[id]) this.packets[id] = []
        this.packets[id].push(new Packet(obj, id))
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

    emit(user: User, packet: Packet, room: RoomClass): void {
        const send = (packet) => {
            const lastFramePositions: Map<any, any> = user['_lastFramePositions']
            const lastFrame = user['_lastFrame']
            let pos
            if (lastFramePositions) {
                const positionByFrame = lastFramePositions.get(lastFrame)
                if (positionByFrame) {
                    pos = positionByFrame
                    lastFramePositions.delete(lastFrame)
                }
            }
            const data = { frame: lastFrame, pos }
            user._socket.emit('w', this.encode ? packet.encode(data) : packet.message(data))
        }
        if (room.filterEmit) {
            const objectPacket = room.filterEmit(user, packet)
            const promiseObjectPacket = objectPacket as Promise<Packet>
            if (promiseObjectPacket.then) {
                promiseObjectPacket.then(send)
            }
            else {
                send(objectPacket)
            }
            return
        }
        send(packet)
    }
}

export const Transmitter = new TransmitterClass()