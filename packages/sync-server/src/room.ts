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
    private memoryTotalObject: object = {}
    private memoryObject: object = {}
    private permanentObject: string[] = []

    static readonly propNameUsers: string = 'users'
    
    static hasExtraProp(obj: any) {
        return obj.$default !== undefined || obj.$syncWithClient !== undefined || obj.$permanent !== undefined 
    }

    static toDict(schema, room?) {
        const dict = {}
        const permanentObject: string[] = []

        function toDict(obj, path = '') {
            for (let prop in obj) {
                const val = obj[prop]
                let p =  (path ? path + '.' : '') + prop
                if (Array.isArray(val)) {
                    dict[p] = GENERIC_KEY_SCHEMA
                    p += '.' + GENERIC_KEY_SCHEMA
                    dict[p] = val[0]
                    toDict(val[0], p)
                }
                else if (Utils.isObject(val)) {
                    if (Room.hasExtraProp(val)) {
                        if (val.$permanent ?? true) permanentObject.push(p)
                        if (room && val.$default !== undefined) {
                            // TODO
                            //set(room, p, val.$default)
                        }
                        if (val.$syncWithClient === false) {
                            continue
                        }
                        // Force to take a type (number here - not important) and not object. Otherwise, Proxy will traverse this object from 
                        dict[p] = Number
                    }
                    else {
                        dict[p] = val
                        toDict(val, p)
                    }
                }
                else {
                    permanentObject.push(p)
                    dict[p] = val
                }
            }
        }

        toDict(schema)

        return {
            dict,
            permanentObject
        }
    }

    private join(user: User, room: RoomClass) {
        if (!user._rooms) user._rooms = []
        user._rooms.push(room.id)
        if (!user.id) user.id = Utils.generateId() 
        if (room['onJoin']) room['onJoin'](user)
        //
        if (this.getUsersLength(room) == 1) {
            // If it's the first to arrive in the room, we save the default values of the room
            this.memoryTotalObject = Room.extractObjectOfRoom(room, room.$schema)
        }
        const packet = new Packet({
            ...this.memoryTotalObject,
            join: true
        }, <string>room.id)
        Transmitter.emit(user, packet, room)
    }

    private leave(user: User, room: RoomClass): void {
        const index = user._rooms.findIndex(id => room.id == id)
        user._rooms.splice(index, 1)
        if (room['onLeave']) room['onLeave'](user)
    }

    private getUsersLength(room: RoomClass) {
        return Object.keys(room.users).length
    }

    addInputs(room: RoomClass, obj: Object): void {
        room.$schema = {
            ...obj,
            ...room.$schema
        }
    }

    snapshotUser(room: RoomClass, userId: string) {
        const userSchema = this.permanentObject
            .filter(path => path.startsWith('users.@'))
            .map(path => path.replace('users.@.', ''))
        const userObject = room.users[userId]
        if (!userObject) return null
        return Room.extractObjectOfRoom(userObject, userSchema)
    }

    snapshot(room: RoomClass) {
        return Room.extractObjectOfRoom(room, this.permanentObject)
    }

    setProxy(room: RoomClass) {
        const self = this
        const { dict, permanentObject } = Room.toDict(room.$schema, room)

        this.permanentObject = permanentObject
        room.$dict = dict

        const getInfoDict = (path, key, dictPath): { fullPath: string, genericPath: string, infoDict: any } => {
            const basePath = dict[dictPath]
            const p: string = (path ? path + '.' : '') + key as string   
            const genericPath = (dictPath ? dictPath + '.' : '') + 
            (basePath == GENERIC_KEY_SCHEMA ? GENERIC_KEY_SCHEMA  : key as string )
            return {
                fullPath: p,
                genericPath,
                infoDict: dict[genericPath]
            }
        }

        function deepProxy(object, path = '', dictPath = '') {
            return new Proxy(object, {
                set(target, key: string, val, receiver) {
                    const { fullPath: p, infoDict, genericPath } = getInfoDict(path, key, dictPath)
                    if (typeof val == 'object' && infoDict && val != null) {
                        const valProxy = deepProxy(val, p, genericPath)
                        if (path == 'users') {
                            World.users[key]['proxy'] = valProxy
                        }
                        Reflect.set(target, key, valProxy, receiver)
                    }
                    else {
                        Reflect.set(target, key, val, receiver)
                    }
                    if (key == 'length' && dict[dictPath] == GENERIC_KEY_SCHEMA) {
                        return true
                    }
                    if (infoDict) {
                        let newObj
                        if (Utils.isObject(infoDict) && val != null) {
                            newObj = Room.extractObjectOfRoom(val, infoDict)
                        }
                        else if (infoDict == GENERIC_KEY_SCHEMA) {
                            newObj = {}
                            for (let key in val) {
                                const item = val[key]
                                if (typeof item == 'string' || 
                                    typeof item == 'number' || 
                                    typeof item == 'boolean') {
                                    newObj[key] = item
                                    continue
                                }
                                newObj[key] = Room.extractObjectOfRoom(item, dict[genericPath + '.' + GENERIC_KEY_SCHEMA])
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
                    const toProxy = (val, path) => {
                        if (typeof key != 'string') {
                            return val
                        }
                        if (key[0] == '_' || val == null) {
                            return val
                        }
                        const { fullPath: p, infoDict, genericPath } = getInfoDict(path, key, dictPath)
                          if (typeof val == 'object' && infoDict) {
                            val = deepProxy(val, p, genericPath)
                        }
                        return val
                    }
                    let val = Reflect.get(target, key, receiver)
                    val = toProxy(val, path)
                    return val
                },
                deleteProperty(target, key) {
                    const { fullPath: p, infoDict } = getInfoDict(path, key, dictPath)
                    delete target[key]
                    if (infoDict) self.detectChanges(room, undefined, p)
                    return true
                }
            })
        }
        return deepProxy(room)
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

        room.$setSchema = (schema) => {
            room.$schema = schema
            return this.setProxy(room)
        }

        room.$patchSchema = (schema) => {
            room.$schema = {
                ...room.$schema,
                ...schema
            }
            return this.setProxy(room)
        }

        room.$snapshot = () => {
            return this.snapshot(room)
        }

        room.$snapshotUser = (userId: string) => {
            return this.snapshotUser(room, userId)
        }

        room.$join = (user: User) => {
            if (user) {
                room.users[user.id] = user
                this.join(room.users[user.id], room)
            }
        }

        room.$leave = (user: User) => {
            this.leave(user, room)
            delete room.users[user.id]
            delete World.users[user.id]['proxy']
            //this.detectChanges(room)
        }

        room.$currentState = () => this.memoryObject
        room.$clearCurrentState = () => {
            this.memoryObject = {}
        }

        this.proxyRoom = room = this.setProxy(room)
        if (this.proxyRoom['onInit']) this.proxyRoom['onInit']()
        return this.proxyRoom
    }

    static extractObjectOfRoom(room: Object, schema): any {
        const newObj = {}
        const schemas: string[] = []
        const _schema = Array.isArray(schema) ? schema : Utils.propertiesToArray(schema)

        function extract(path: string) {
            const match = new RegExp('^(.*?)\\.\\' + GENERIC_KEY_SCHEMA).exec(path)
            if (match) {
                const generic = get(room, match[1])
                if (generic) {
                    const keys = Object.keys(generic)
                    for (let key of keys) {
                        extract(path.replace(GENERIC_KEY_SCHEMA, key))
                    }
                }
            }
            else {
                schemas.push(path)
            }
        }

        for (let path of _schema) {
            extract(path)
        }

        for (let sheme of schemas) {
            set(newObj, sheme, get(room, sheme))
        }

        return newObj
    }

    detectChanges(room: RoomClass, obj: Object | undefined, path: string): void {   
        
        // If after changing a room, we continue to use the wrong player instance, we ignore the changes made on an old proxy 
        if (obj != undefined) {
            const [prop, userId] = path.split('.')
            if (prop == 'users') {
                if (!room.users[userId]) {
                    return
                }
            }
        }

        //console.time()
        set(this.memoryObject, path, obj)
        set(this.memoryTotalObject, path, obj)
        //console.timeEnd()

        if (this.proxyRoom['onChanges']) this.proxyRoom['onChanges'](this.memoryObject)

        const id: string = room.id as string

        World.changes.next({
            ...World.changes.value,
            [id]: room
        })
    }
}