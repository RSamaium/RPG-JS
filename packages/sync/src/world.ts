import { Room } from './room'
import { Transmitter } from './transmitter'
import { Transport } from './transports/socket'
import { DefaultRoom, User } from './rooms/default'
import { Packet } from './packet';
import { RoomClass } from './interfaces/room.interface';

export class WorldClass {

    private rooms = new Map()
    private users: {
        [key: string]: User
    } = {}
    private userClass = User

    setUserClass(userClass: any) {
        this.userClass = userClass
    }

    transport(io): void {
        const transport = new Transport(io)
        transport.onConnected((socket, id: string) => {
            const user = new this.userClass()
            user._socket = socket
            user._rooms = []
            user.id = id
            this.users[id] = user
        })
        transport.onDisconnected((socket, id: string) => {
            this.forEachUserRooms(id, (room) => {
                delete room.users[id]
            })
            delete this.users[id]
        })
        transport.onJoin((roomId, id) => {
            this.joinRoom(roomId, id)
        })
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

    forEachUserRooms(userId: string, cb: (room: RoomClass, user?: User) => void): void {
        const user = this.getUser(userId)
        for (let roomId of user._rooms) {
            const room = this.getRoom(roomId)
            cb(room, user)
        }
    }

    getUser(id: string): User {
        if (!id.startsWith('$')) {
            throw new Error('The user identifier must begin with the $ character')
        }
        return this.users[id]
    }

    send(): void {
        Transmitter.forEach((packets: Packet[], id: string) => {
            const room = this.getRoom(id)
            for (let id in room.users) {
                const user = room.users[id]
                for (let packet of packets) {
                    Transmitter.emit(user, packet) 
                } 
            }
        })
        Transmitter.clear()
    }

    joinRoom(roomId: string, userId: string): RoomClass | undefined {
        const room = this.getRoom(roomId)
        if (!room) return
        room.users[userId] = this.users[userId]
        return room
    }

    addRoom(id: string, roomClass): RoomClass {
        if (roomClass.constructor.name == 'Function') {
            roomClass = new roomClass()
        }
        const room = new Room().add(id, roomClass)
        this.rooms.set(id, room)
        return room
    }

    getRoom(id: string): RoomClass {
        return this.rooms.get(id)
    }

    removeRoom(id: string): void {
        this.rooms.delete(id)
    }
}

export const World = new WorldClass()