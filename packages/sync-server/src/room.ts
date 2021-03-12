import  get from 'get-value'
import  set from 'set-value'
import { Utils, GENERIC_KEY_SCHEMA } from './utils'
import { Transmitter } from './transmitter'
import { Packet } from './packet'
import { RoomClass } from './interfaces/room.interface';
import { User } from './rooms/default'
import { World } from './world'

export class Room {

    private proxyRoom: RoomClass
    private memoryObject: Object = {}

    static readonly propNameUsers: string = 'users'

    private join(user: User, room: RoomClass) {
        if (!user._rooms) user._rooms = []
        user._rooms.push(room.id)
        if (!user.id) user.id = Utils.generateId()
        if (room['onJoin']) room['onJoin'](user)
        const object = this.extractObjectOfRoom(room)
        const packet = new Packet(object, <string>room.id)
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

    add(id: string, room: RoomClass): RoomClass {
        room.id = id
        room.$dict = {}
        if (!room.$schema) room.$schema = {}
        if (!room.$schema.users) room.$schema.users = [{id: String}]
        if (!room.$inputs) room.$inputs = {}
        if (!room.users) room.users = {} 
        if (room.$inputs) this.addInputs(room, room.$inputs)

        room.$detectChanges = () => {
            //this.detectChanges(room)
        }

        room.$join = (user: User) => {
            room.users[user.id] = user
            this.join(room.users[user.id], room)
            //this.detectChanges(room)
        }

        room.$leave = (user: User) => {
            this.leave(user, room)
            delete room.users[user.id]
            //this.detectChanges(room)
        }

        room.$currentState = () => this.memoryObject
        room.$clearCurrentState = () => this.memoryObject = {}

        const dict = {}
        const self = this

        function toDict(obj, path = '') {
            for (let prop in obj) {
                const val = obj[prop]
                let p =  (path ? path + '.' : '') + prop
                if (Array.isArray(val)) {
                    p += '.' + GENERIC_KEY_SCHEMA
                    dict[p] = Object.keys(val[0])
                    toDict(val[0], p)
                }
                else if (Utils.isObject(val)) {
                    dict[p] = Object.keys(val)
                    toDict(val, p)
                }
                else {
                    dict[p] = val
                }
            }
        }

        toDict(room.$schema)
        room.$dict = dict

        const getInfoDict = (path, key): { fullPath: string, infoDict: object } => {
            const p: string = (path ? path + '.' : '') + (key as string)    
            const genericPath = p.replace(/\$\$[^.]+/g, GENERIC_KEY_SCHEMA)
            return {
                fullPath: p,
                infoDict: dict[genericPath]
            }
        }

        function deepProxy(object, path = '') {
            return new Proxy(object, {
                set(target, key, val, receiver) {
                    const { fullPath: p, infoDict } = getInfoDict(path, key)
                    if (typeof val == 'object' && infoDict && val != null) {
                        Reflect.set(target, key, deepProxy(val, p), receiver)
                    }
                    else {
                        Reflect.set(target, key, val, receiver)
                    }
                    if (infoDict) {
                        let newObj
                        if (Array.isArray(infoDict)) {
                            newObj = {}
                            for (let prop of infoDict) {
                                newObj[prop] = val[prop]
                            }
                        }
                        else {
                            newObj = val
                        }
                        self.detectChanges(room, newObj, p)
                    }
                    return true
                },
                get(target, key, receiver) {
                    let val = Reflect.get(target, key, receiver)
                    const { fullPath: p, infoDict } = getInfoDict(path, key)
                    if (typeof val == 'object' && key[0] != '_' && val != null && infoDict) {
                        val = deepProxy(val, p)
                    }
                    return val
                },
                deleteProperty(target, key) {
                    const { fullPath: p, infoDict } = getInfoDict(path, key)
                    if (infoDict) self.detectChanges(room, undefined, p)
                    delete target[key]
                    return true
                }
            })
        }
        this.proxyRoom = room = deepProxy(room)
        if (this.proxyRoom['onInit']) this.proxyRoom['onInit']()
        return this.proxyRoom
    }

    extractObjectOfRoom(room: RoomClass): any {
        const newObj = {}
        const schemas: string[] = []
        const schema = Utils.propertiesToArray(room.$schema)

        function extract(path: string) {
            const match = new RegExp('^(.*?)\\.\\' + GENERIC_KEY_SCHEMA).exec(path)
            if (match) {
                const generic = get(room, match[1])
                const keys = Object.keys(generic)
                for (let key of keys) {
                   extract(path.replace(GENERIC_KEY_SCHEMA, '$' + key))
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

        return newObj
    }

    detectChanges(room: RoomClass, obj: Object | undefined, path: string): void {
        set(this.memoryObject, path, obj)

        if (this.proxyRoom['onChanges']) this.proxyRoom['onChanges']()

        const id: string = room.id as string

        World.changes.next({
            ...World.changes.value,
            [id]: room
        })
    }
}