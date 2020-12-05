import { Room } from './room'
import { Transmitter } from './transmitter'
import { Transport } from './transports/socket'
import { DefaultRoom, User } from './rooms/default'

export class WorldClass {

    private rooms = new Map()
    private users = {}

    transport(io) {
        const transport = new Transport(io)
        transport.onConnected((socket, id) => {
            const user = new User()
            user._socket = socket
            user._rooms = []
            user.id = id
            this.users[id] = user
        })
        transport.onDisconnected((socket, id) => {
            this.forEachUserRooms(id, (room) => {
                delete room.users[id]
            })
            delete this.users[id]
        })
        transport.onJoin((roomId, id) => {
            const room = this.getRoom(roomId)
            if (!room) return
            room.users[id] = this.users[id]
        })
        transport.onInput((id, prop, value) => {
            this.forEachUserRooms(id, (room) => {
                if (room.$inputs && room.$inputs[prop]) {
                    room[prop] = value
                }
            })
        })
        transport.onAction((id, name, value) => {
            this.forEachUserRooms(id, (room, user) => {
                if (room.$actions && room.$actions[name]) {
                    room[name](user, value)
                }
            })
        })
    }

    forEachUserRooms(userId, cb) {
        const user = this.getUser(userId)
        for (let roomId of user._rooms) {
            const room = this.getRoom(roomId)
            cb(room, user)
        }
    }

    getUser(id) {
        return this.users[id]
    }

    send() {
        Transmitter.forEach((packet, id) => {
            const room = this.getRoom(id)
            for (let id in room.users) {
                const user = room.users[id]
                Transmitter.emit(user, packet) 
            }
        })
        Transmitter.clear()
    }

    addRoom(id, roomClass) {
        const room = new Room().add(id, roomClass)
        this.rooms.set(id, room)
        return room
    }

    getRoom(id) {
        return this.rooms.get(id)
    }

    removeRoom(id) {
        this.rooms.delete(id)
    }
}

export const World = new WorldClass()