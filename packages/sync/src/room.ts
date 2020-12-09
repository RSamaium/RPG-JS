import onChange from 'on-change'
import { diff } from 'deep-diff'
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

    static readonly propNameUsers: string = 'users'

    private join(user: User, room: RoomClass) {
        if (!user._rooms) user._rooms = []
        user._rooms.push(room.id)
        if (!user.id) user.id = Utils.generateId()
        if (room['onJoin']) room['onJoin'](user)
        const newObj = this.getPropertiesBySchema(room)
        const packet = new Packet(newObj)
        Transmitter.emit(user, packet)
    }

    private leave(user: User, room: RoomClass): void {
        const index = user._rooms.findIndex(id => room.id == id)
        user._rooms.splice(index, 1)
        if (room['onLeave']) room['onLeave'](user)
    }

    private getPropertiesBySchema(room: RoomClass, schemaObj?: string[]): Object {
        let newObj = {}

        const schema = Utils.propertiesToArray(room.$schema)
        if (!schemaObj) schemaObj = Utils.propertiesToArray(room)

        if (!schemaObj) return newObj

        for (let propSchema of schema) {
            let prop = propSchema.replace(/\.[0-9]+/g, '.$x')
            for (let propSchemaObj of schemaObj) {
                const regexp = new RegExp(`\\.([0-9]+|${REGEXP_GENERIC_KEY})`, 'g')
                let propObj = propSchemaObj.replace(regexp, '.$x')
                if (prop == propObj) {
                    set(newObj, propSchemaObj, get(room, propSchemaObj))
                }
            }
        }

        return newObj
    }

    addInputs(room: RoomClass, obj: Object): void {
        room.$schema = {
            ...obj,
            ...room.$schema
        }
    }

    add(id: string, room: RoomClass): RoomClass {
        room.id = id
        if (!room.$schema) room.$schema = {}
        if (!room.$schema.users) room.$schema.users = [{id: String}]
        if (!room.$inputs) room.$inputs = {}
        if (!room.users) room.users = {} 
        if (room.$inputs) this.addInputs(room, room.$inputs)
        this.proxyRoom = onChange(room, this.detectChanges.bind(this), {
            ignoreUnderscores: true
        })
        if (this.proxyRoom['onInit']) this.proxyRoom['onInit']()
        return this.proxyRoom
    }

    detectChanges(path: string, value: any, previousValue: any): void {
        const difference = diff(previousValue, value)

        let schemaObj: any = []

        if (!difference) return

        for (let diffObj of difference) {
            const rhs = diffObj.rhs
            let realPath
            if (diffObj.path) {
                realPath = (path ? path + '.' : '') + diffObj.path.join('.')
            } 
            else {
                realPath = path
            } 
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
            if (Utils.isObject(rhs) || Array.isArray(rhs)) {
                schemaObj = [...schemaObj, ...Utils.propertiesToArray(rhs)]
                schemaObj = schemaObj.map(p => (realPath != '' ? realPath + '.' : '') + p) 
            }
            else {
                schemaObj = [...schemaObj, realPath]
            }
        }

        const newObj = this.getPropertiesBySchema(this.proxyRoom, schemaObj)

        if (Object.keys(newObj).length == 0) {
            return
        }

        if (this.proxyRoom['onChanges']) this.proxyRoom['onChanges'](newObj)

        Transmitter.addPacket(this.proxyRoom, newObj)
    }
}