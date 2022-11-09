import { RpgCommonGame, RpgCommonPlayer, GameSide, RpgShape } from "@rpgjs/common";
import { BehaviorSubject, combineLatest, Observable } from "rxjs";
import { RpgRenderer } from "./Renderer";
import { RpgClientEngine } from "./RpgClientEngine";
import { map } from "rxjs/operators";
import { ObjectFixture, ObjectFixtureList } from "@rpgjs/types";

export class GameEngineClient extends RpgCommonGame {
    playerId: string
    standalone: boolean
    clientEngine: RpgClientEngine
    renderer: RpgRenderer

    private _objects: BehaviorSubject<ObjectFixtureList> = new BehaviorSubject({})
    private _obsObjects: {
        [id: string]: BehaviorSubject<ObjectFixture>
    } = {}
    private _shapes: BehaviorSubject<ObjectFixtureList> = new BehaviorSubject({})
    private _objectsChanged: BehaviorSubject<ObjectFixtureList> = new BehaviorSubject({})

    world = {
        getObjects: this.getObjects.bind(this),
        getObject: (id: string): RpgCommonPlayer | null => {
            const obj = this.getObject(id)
            if (!obj) return null
            return obj.object
        },
        getShape: (id: string): RpgShape | null => {
            const obj = this.getShape(id)
            if (!obj) return null
            return obj.object
        },
        getAll: (id: string): RpgCommonPlayer | RpgShape | null => {
            const obj = this.getObjectAndShape(id)
            if (!obj) return null
            return obj.object
        },
        removeObject: this.removeObject.bind(this),
        getObjectsOfGroup: () => {
            return {
                ...this.getObjects(),
                ...this.events
            }
        },
        getShapesOfGroup: () => {
            return this.getShapes()
        }
    }

    constructor() {
        super(GameSide.Client)
    }

    private _get(prop: '_objects' | '_shapes', id: string): ObjectFixture | null {
        const objects = this[prop].value
        const val = objects[id]
        if (!val) return null
        return val
    }

    get objectsChanged(): Observable<{ [id: string]: ObjectFixture }> {
        return this._objectsChanged.asObservable()
    }

    setObjectsChanged(val: {
        [playerId: string]: ObjectFixture
    }) {
        this._objectsChanged.next(val)
    }

    listenObject(id: string): Observable<ObjectFixture> {
        return this._obsObjects[id].asObservable()
    }

    get objects(): Observable<{ [id: string]: ObjectFixture }> {
        return this._objects.asObservable()
    }

    get shapes(): Observable<{ [id: string]: ObjectFixture }> {
        return this._shapes.asObservable()
    }

    get all(): Observable<{ [id: string]: ObjectFixture }> {
        return combineLatest([
            this.objects,
            this.shapes
        ]).pipe(
            map(([objects, shapes]) => {
                return {
                    ...objects,
                    ...shapes
                }
            })
        )
    }

    getShapes(): { [id: string]: ObjectFixture } {
        return this._shapes.value
    }

    getObjects(): { [id: string]: ObjectFixture } {
        return this._objects.value
    }

    getObject(id: string): ObjectFixture | null {
        return this._get('_objects', id)
    }

    getShape(id: string): ObjectFixture | null {
        return this._get('_shapes', id)
    }

    getObjectAndShape(id: string): ObjectFixture | null {
        let obj = this.getObject(id)
        if (!obj) obj = this.getShape(id)
        return obj
    }

    resetObjects() {
        this._objects.next({})
        this._shapes.next({})
    }

    private _remove(prop: '_objects' | '_shapes', id: string) {
        const logic = prop == '_objects' ? this.getObject(id) : this.getShape(id)
        if (logic) {
            const objects = { ...this[prop].value } // clone
            delete objects[id]
            delete this._obsObjects[id]
            this[prop].next(objects)
            return true
        }
        return false
    }

    removeObject(id: string): boolean {
        if (this.events[id]) {
            delete this.events[id]
        }
        return this._remove('_objects', id)
    }

    removeShape(id: string): boolean {
        return this._remove('_shapes', id)
    }

    removeObjectAndShape(id: string): boolean {
        return this.removeObject(id) && this.removeShape(id)
    }

    static toArray(obj: any, prop: string) {
        if (obj[prop]) obj[prop] = Object.values(obj[prop])
    }

    updateObject(obj) {
        const {
            playerId: id,
            params,
            localEvent,
            paramsChanged,
            isShape
        } = obj
        GameEngineClient.toArray(params, 'components')
        GameEngineClient.toArray(params, 'polygon')
        const isMe = () => id == this.playerId
        let logic
        let teleported = false
        let propName = '_objects'

        const createObsForObject = (data) => this._obsObjects[id] = new BehaviorSubject(data)

        if (isShape) {
            propName = '_shapes'
            logic = this.world.getShape(id)
            if (!logic) {
                logic = this.addShape(params)
                createObsForObject({ logic })
            }
        }
        else {
            if (localEvent) {
                logic = this.events[id]
                if (!logic) {
                    logic = this.addEvent(RpgCommonPlayer, id)
                    createObsForObject({ logic })
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
                createObsForObject({ logic })
            }
        }
        logic.prevParamsChanged = Object.assign({}, logic)
        for (let key in params) {
            if (!localEvent && 
                (key == 'position' ||
                (key == 'direction' && paramsChanged && paramsChanged.position))) {
                if (isMe() && logic.canMove) continue
            }
            logic[key] = params[key]
        }
        if (paramsChanged) {
            GameEngineClient.toArray(paramsChanged, 'components')
            if (paramsChanged.components) logic.componentChanged = paramsChanged.components
            if (paramsChanged.teleported) {
                teleported = true
                logic.position = { ...params.position } // clone
                logic.direction = params.direction
            }
            if (!logic.paramsChanged) logic.paramsChanged = {}
            logic.paramsChanged = paramsChanged
        }

        const newObject = {
            object: logic,
            paramsChanged
        }

        this[propName].next({ 
            ...this[propName].value,
            ...{
                [id]: newObject
            }
        })

        this._obsObjects[id].next(newObject)

        return newObject
    }
}