import { diff } from 'deep-object-diff';
import  get from 'get-value'
import  set from 'set-value'
import { Utils } from './utils'
import { Transmitter } from './transmitter'
import { Packet } from './packet'
import { World } from './world'
import { RoomClass } from './interfaces/room.interface';
import { User } from './rooms/default';

enum ObjectKind {
    New = 'N',
    Delete = 'D'
}

const REGEXP_GENERIC_KEY: string = '\\$[a-zA-Z0-9-_]+'

export class Room {

    private proxyRoom: RoomClass
    private prevMemoryObject: Object = {}
    private memoryObject: Object = {}

    static readonly propNameUsers: string = 'users'

    private join(user: User, room: RoomClass) {
        if (!user._rooms) user._rooms = []
        user._rooms.push(room.id)
        if (!user.id) user.id = Utils.generateId()
        if (room['onJoin']) room['onJoin'](user)
        const packet = new Packet(this.memoryObject)
        Transmitter.emit(user, packet)
    }

    private leave(user: User, room: RoomClass): void {
        const index = user._rooms.findIndex(id => room.id == id)
        user._rooms.splice(index, 1)
        if (room['onLeave']) room['onLeave'](user)
    }

    addInputs(room: RoomClass, obj: Object): void {
        room.$schema = {
            ...obj,
            ...room.$schema
        }
    }

    add(id: string, room: RoomClass, options?: any): RoomClass {
        room.id = id
        if (!room.$schema) room.$schema = {}
        if (!room.$schema.users) room.$schema.users = [{id: String}]
        if (!room.$inputs) room.$inputs = {}
        if (!room.users) room.users = {} 
        if (room.$inputs) this.addInputs(room, room.$inputs)
       /* this.proxyRoom = onChange(room, this.detectChanges.bind(this), {
            ignoreUnderscores: true,
            ...options
        })*/
        room.$detectChanges = () => {
            this.detectChanges(room)
        }

        room.$join = (user: User) => {
            room.users[user.id] = user
            this.join(user, room)
            this.detectChanges(room)
        }

        room.$leave = (user: User) => {
            this.leave(user, room)
            delete room.users[user.id]
            this.detectChanges(room)
        }

        room.$currentState = () => this.memoryObject

        this.extractObjectOfRoom(room)

        this.proxyRoom = room
        if (this.proxyRoom['onInit']) this.proxyRoom['onInit']()
        return this.proxyRoom
    }

    extractObjectOfRoom(room: RoomClass): Object {
        const newObj = {}
        const schemas: string[] = []
        const schema = Utils.propertiesToArray(room.$schema)

        function extract(path: string) {
            const match = /^(.*?)\.\$/.exec(path)
            if (match) {
                const generic = get(room, match[1])
                const keys = Object.keys(generic)
                for (let key of keys) {
                   extract(path.replace('$', key))
                }
            }
            else {
                schemas.push(path)
            }
        }
        
        for (let path of schema) {
            extract(path)
        }

        for (let sheme of schemas) {
            set(newObj, sheme, get(room, sheme))
        }

        this.prevMemoryObject = { ...this.memoryObject }
        this.memoryObject = newObj

        return newObj
    }

    detectChanges(room: RoomClass): void {
        this.extractObjectOfRoom(room)
        
        const difference = diff(this.prevMemoryObject, this.memoryObject)

        let schemaObj: any = []

        if (Object.keys(difference).length == 0) return


       /* for (let diffObj of difference) {
            const rhs = diffObj.rhs
            let realPath
 
            const regexp = new RegExp(`^users\.${REGEXP_GENERIC_KEY}$`)
            if (regexp.test(realPath)) {
                switch (diffObj.kind) {
                    case ObjectKind.New:
                        var realUser = World.getUser(diffObj.rhs.id)
                        this.join(realUser, this.proxyRoom) 
                        break;
                    case ObjectKind.Delete:
                        var realUser = World.getUser(diffObj.lhs.id)
                        this.leave(realUser, this.proxyRoom) 
                        break;
                }
            }
        }*/

        if (this.proxyRoom['onChanges']) this.proxyRoom['onChanges'](difference)

        Transmitter.addPacket(this.proxyRoom, difference)
    }
}