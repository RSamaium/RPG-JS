import { RpgCommonGame, RpgCommonPlayer } from "@rpgjs/common";
import { BehaviorSubject, Observable } from "rxjs";
import { RpgRenderer } from "./Renderer";
import { RpgClientEngine } from "./RpgClientEngine";
import merge from 'lodash.merge'

export type ObjectFixture = {
    object: any,
    paramsChanged: any
}

export class GameEngineClient extends RpgCommonGame {
    playerId: string
    standalone: boolean
    clientEngine: RpgClientEngine
    renderer: RpgRenderer

    private _objects: BehaviorSubject<{
        [playerId: string]: ObjectFixture
    }> = new BehaviorSubject({})

    world = {
        getObjects: this.getObjects.bind(this),
        getObject: (id: string): RpgCommonPlayer | null => {
            const obj = this.getObject(id)
            if (!obj) return null
            return obj.object
        },
        removeObject: this.removeObject.bind(this),
        getObjectsOfGroup: () => {
            return {
                ...this.getObjects(),
                ...this.events
            }
        }
    }

    constructor() {
        super('client')
    }

    get objects(): Observable<{ [id: string]: ObjectFixture }> {
        return this._objects.asObservable()
    }

    getObjects(): { [id: string]: ObjectFixture } {
        return this._objects.value
    }

    getObject(id: string): ObjectFixture | null {
        const objects = this._objects.value
        const val = objects[id]
        if (!val) return null
        return val
    }

    resetObjects() {
        this._objects.next({})
    }

    removeObject(id: any): boolean {
        const logic = this.getObject(id)
        if (this.events[id]) {
            delete this.events[id]
        }
        if (logic) {
            const objects = { ...this._objects.value } // clone
            delete objects[id]
            this._objects.next(objects)
            return true
        }
        return false
    }

    updateObject(obj) {
        const {
            playerId: id,
            params,
            localEvent,
            paramsChanged
        } = obj
        const isMe = () => id == this.playerId
        let logic
        let teleported = false
        if (localEvent) {
            logic = this.events[id]
            if (!logic) {
                logic = this.addEvent(RpgCommonPlayer, id)
                this.events[id] = {
                    object: logic
                }
            }
            else {
                logic = logic.object
            }
        }
        else {
            logic = this.world.getObject(id)
        }
        if (!logic) {
            logic = this.addPlayer(RpgCommonPlayer, id)
        }
        logic.prevParamsChanged = Object.assign({}, logic)
        for (let key in params) {
            if (!localEvent && 
                (key == 'position' ||
                (key == 'direction' && paramsChanged && paramsChanged.position))) {
                if (isMe()) continue
            }
            logic[key] = params[key]
        }
        if (paramsChanged) {
            if (paramsChanged.teleported) {
                teleported = true
                logic.position = { ...params.position } // clone
            }
            if (!logic.paramsChanged) logic.paramsChanged = {}
            logic.paramsChanged = merge(paramsChanged, logic.paramsChanged)
        }
        this._objects.next({
            ...this._objects.value,
            ...{
                [id]: {
                    object: logic,
                    paramsChanged
                }
            }
        })
        if (teleported && isMe()) {
            //this.isTeleported = true
        }
        return logic
    }
}