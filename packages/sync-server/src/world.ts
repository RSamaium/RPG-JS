import { Room } from './room'
import { Transmitter } from './transmitter'
import { Transport } from './transports/socket'
import { User } from './rooms/default'
import { Packet } from './packet';
import { RoomClass } from './interfaces/room.interface'
import { BehaviorSubject } from 'rxjs'

export class WorldClass {

    private rooms: Map<string, RoomClass> = new Map()
    public users: {
        [key: string]: User
    } = {}
    private userClass = User
    changes: BehaviorSubject<any> = new BehaviorSubject({})

    setUserClass(userClass: any) {
        this.userClass = userClass
    }

    transport(io): void {
        const transport = new Transport(io)
        transport.onConnected(this.connectUser.bind(this))
        transport.onDisconnected(this.disconnectUser.bind(this))
        transport.onJoin(this.joinRoom.bind(this))
        transport.onInput((id: string, prop: string, value: any) => {
            this.forEachUserRooms(id, (room: RoomClass) => {
                if (room.$inputs && room.$inputs[prop]) {
                    room[prop] = value
                }
            })
        })
        transport.onAction((id: string, name: string, value: any) => {
            this.forEachUserRooms(id, (room, user) => {
                if (room.$actions && room.$actions[name]) {
                    room[name](user, value)
                }
            })
        })
    }

    forEachUserRooms(userId: string, cb: (room: RoomClass, user: User) => void): void {
        const user = this.getUser(userId)
        if (!user) return
        for (let roomId of user._rooms) {
            const room = this.getRoom(roomId)
            cb(room, user)
        }
    }

    getUsers() {
        return this.users 
    }

    getUser(id: string, getProxy: boolean = true): User | null {
        if (!this.users[id]) return null
        if (getProxy && this.users[id]['proxy']) {
            return this.users[id]['proxy'] 
        }
        return this.users[id]
    }

    setUser(user, socket?) {
        if (socket) user._socket = socket
        user._rooms = []
        this.users[user.id] = user
        return this.users[user.id]
    }

    send(): void {
        this.rooms.forEach((room: any, id: string) => {
            const obj = room.$currentState()
            if (Object.keys(obj).length == 0) {
                return
            }
            Transmitter.addPacket(room, obj)
            for (let id in room.users) {
                const user = room.users[id]
                const packets = Transmitter.getPackets(room)
                if (packets) {
                    for (let packet of packets) {
                        Transmitter.emit(user, packet, room)
                    }
                }
            }
            room.$clearCurrentState()
        })
        Transmitter.clear()
    }

    connectUser(socket, id: string): User {
        const user = new this.userClass()
        user.id = id
        socket.emit('uid', id)
        this.setUser(user, socket)
        return user
    }

    disconnectUser(userId: string): void {
        this.forEachUserRooms(userId, (room: RoomClass, user: User) => {
            if (room.$leave) room.$leave(user)
        })
        delete this.users[userId]
    }

    private joinOrLeaveRoom(type: string, roomId: string, userId: string): RoomClass | undefined  {
        const room = this.getRoom(roomId)
        if (!room) return
        if (room[type]) room[type](this.getUser(userId, false))
        return room
    }

    leaveRoom(roomId: string, userId: string): RoomClass | undefined {
        return this.joinOrLeaveRoom('$leave', roomId, userId)
    }

    joinRoom(roomId: string, userId: string): RoomClass | undefined {
        return this.joinOrLeaveRoom('$join', roomId, userId)
    }

    addRoom(id: string, roomClass): any {
        if (roomClass.constructor.name == 'Function') {
            roomClass = new roomClass()
        }
        const room = new Room().add(id, roomClass)
        this.rooms.set(id, room)
        return room
    }

    getRoom(id: string): any {
        return this.rooms.get(id)
    }

    getRooms() {
        return this.rooms
    }

    removeRoom(id: string): void {
        this.rooms.delete(id)
    }

    clear() {
        this.rooms.clear()
        this.users = {}
    }
}

export const World = new WorldClass()