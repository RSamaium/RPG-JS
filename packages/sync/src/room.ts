import onChange from 'on-change'
import { diff } from 'deep-diff'
import  get from 'get-value'
import  set from 'set-value'
import { Utils } from './utils'
import { Transmitter } from './transmitter'
import { Packet } from './packet'
import { World } from './world'

enum ObjectKind {
    New = 'N',
    Delete = 'D'
}

const REGEXP_GENERIC_KEY: string = '\\$[a-zA-Z0-9-_]+'

export class Room {

    static readonly propNameUsers = 'users'

    join(user, room) {
        if (!user._rooms) user._rooms = []
        user._rooms.push(room.id)
        if (!user.id) user.id = Utils.generateId()
        if (room.onJoin) room.onJoin.call(room, user)
        const newObj = this.getPropertiesBySchema(room)
        const packet = new Packet(newObj)
        Transmitter.emit(user, packet)
    }

    leave(user, room) {
        const index = user._rooms.findIndex(id => room.id == id)
        user._rooms.splice(index, 1)
        if (room.onLeave) room.onLeave(user)
    }

    getPropertiesBySchema(room, schemaObj?) {
        let newObj = {}

        const schema = Utils.propertiesToArray(room.$schema)
        if (!schemaObj) schemaObj = Utils.propertiesToArray(room)

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

    addInputs(room, obj) {
        room.$schema = {
            ...obj,
            ...room.$schema
        }
        console.log()
    }

    add(id, roomClass: any) {
        const self = this
        const room = new roomClass()
        room.id = id
        if (!room.$schema) room.$schema = {}
        if (!room.$schema.users) room.$schema.users = [{id: String}]
        if (!room.$inputs) room.$inputs = {}
        if (!room.users) room.users = {} 
        if (room.$inputs) this.addInputs(room, room.$inputs)
        const proxyRoom = onChange(room, function (path: string, value: any, previousValue: any, name) {
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
                            self.join(realUser, proxyRoom) 
                            break;
                        case ObjectKind.Delete:
                            var realUser = World.getUser(diffObj.lhs.id)
                            self.leave(realUser, proxyRoom) 
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

            const newObj = self.getPropertiesBySchema(room, schemaObj)

            if (Object.keys(newObj).length == 0) {
                return
            }
 
            Transmitter.addPacket(room, newObj)
        }, {
            ignoreUnderscores: true
        })
        if (proxyRoom.onInit) proxyRoom.onInit()
        return proxyRoom
    }

    detectChanges() {
        
    }
}