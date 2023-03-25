import { RpgCommonMap, Utils, RpgShape, RpgCommonGame, AbstractObject } from '@rpgjs/common'
import { TiledParserFile } from '@rpgjs/tiled'
import { EventOptions } from '../decorators/event'
import { RpgPlayer, EventMode, RpgEvent } from '../Player/Player'
import { Move } from '../Player/MoveManager'
import { RpgServerEngine } from '../server'
import { Observable } from 'rxjs'
import path from 'path'
import { constructor, HitBox, MovingHitbox, Position, Tick } from '@rpgjs/types'

export type EventPosOption = {
    x: number,
    y: number,
    z?: number,
    event: EventOptions
}
export type EventOption = EventPosOption | EventOptions

export type PlayersList = {
    [eventId: string]: RpgEvent
}

export type EventsList = {
    [playerId: string]: RpgPlayer
}

class AutoEvent extends RpgEvent {
    static mode: EventMode
    static hitbox: any = {}

    onInit() {
        const { graphic, direction, speed, frequency, move } = this.properties
        if (graphic) {
            this.setGraphic(graphic)
        }
        if (direction) {
            this.changeDirection(direction)
        }
        if (speed) {
            this.speed = speed
        }
        if (frequency) {
            this.frequency = frequency
        }
        if (move == 'random') {
            this.infiniteMoveRoute([Move.tileRandom()])
        }
    }

    async onAction(player: RpgPlayer) {
        const { text } = this.properties
        if (text) {
            await player.showText(text, {
                talkWith: this
            })
        }
    }
}

export class RpgMap extends RpgCommonMap {

    public _events: EventOption[]
    public file: any

    /** 
    * @title event list
    * @prop { { [eventId: string]: RpgEvent } } [events]
    * @memberof Map
    * */
    public events: EventsList = {}

    constructor(private _server: RpgServerEngine) {
        super()
    }

    // alias of users property in simple-room package
    get players(): PlayersList {
        return this['users']
    }

    get nbPlayers(): number {
        return Object.keys(this.players).length
    }

    async load() {
        if (RpgCommonMap.buffer.has(this.id)) {
            return
        }
        const hasAssetsPath = this._server.assetsPath
        const parser = new TiledParserFile(
            this.file,
            this._server.inputOptions.basePath + '/' + this._server.assetsPath
        )
        const data = await parser.parseFilePromise({
            getOnlyBasename: !!hasAssetsPath
        })
        super.load(data)
        this.getAllObjects().forEach(this.createShape.bind(this))
        this.loadProperties((data as any).properties)
        this._server.workers?.call('loadMap', {
            id: this.id,
            data
        })
        RpgCommonMap.buffer.set(this.id, this)
        this.createDynamicEvent(this._events as EventPosOption[])
        if (this.onLoad) this.onLoad()
    }

    private loadProperties(properties: {
        [key: string]: any
    }) {
        for (let key in properties) {
            this[key] = properties[key]
        }
    }

    get game(): RpgCommonGame {
        return this._server.gameEngine
    }

    private removeObject(object: RpgPlayer | RpgEvent) {
        this.getShapes().forEach(shape => shape.out(object))
        const events: RpgPlayer[] = Object.values(this.game.world.getObjectsOfGroup(this.id, object))
        for (let event of events) {
            object.getShapes().forEach(shape => shape.out(event))
            event.getShapes().forEach(shape => shape.out(object))
        }
        object.stopMoveTo()
        this.grid.clearObjectInCells(object.id)
        for (let playerId in this.players) {
            if (object.id == playerId) continue
            const otherPlayer = this.players[playerId]
            if (otherPlayer.following?.id == object.id) {
                otherPlayer.cameraFollow(otherPlayer)
            }
        }
        // last player before removed of this map 
        if (this.nbPlayers === 1) {
            // clear cache for this map
            this._server.sceneMap.removeMap(this.id)
        }
    }

    // Hook: called by simple-room package
    onLeave(player: RpgPlayer) {
        this.removeObject(player)
    }

    // TODO
    autoLoadEvent() {
        this.getShapes().forEach(shape => {
            const { properties } = shape
            const { x, y, pos, w, h } = shape.hitbox
            if (shape.isEvent() && !this.events[shape.name]) {
                const mode = properties.mode || EventMode.Shared
                AutoEvent.prototype['_name'] = shape.name
                AutoEvent.mode = mode
                AutoEvent.hitbox = {
                    width: 32,
                    height: 16
                }
                const event = this.createEvent({
                    x,
                    y,
                    event: AutoEvent
                }, mode, shape)
                if (event) this.events[shape.name] = event
            }
        })
    }

    /**
     * Edit a tile on the map. All players on the map will see the modified tile
     * 
     * 
     * @title Change Tile in map
     * @since 3.0.0-beta.4
     * @method map.setTile(x,y,layer,tileInfo)
     * @param {number} x Position X
     * @param {number} y Position Y
     * @param {string | ((layer: any) => boolean)} layer Name of the layer where you want to put a tile. OYou can also put a function that will act as a filter. The first parameter is the layer and you return a boolean to indicate if you modify the tile of this layer or not
     * @param {object} tileInfo Object with the following properties:
     *  - {number} gid: The tile number in tileset (from 1)
     *  - {object} properties Property of the tile. You own object. To set a collision, set the `collision:true` property
     * @example
     * ```ts
     * map.setTile(15, 18, 'mylayer', { gid: 2 })
     * ```
     * @returns {void}
     * @memberof Map
     */
    setTile(x: number, y: number, layerFilter: string | ((layer: any) => boolean), tileInfo: {
        gid: number,
        properties?: object
    }): any {
        const tiles = super.setTile(x, y, layerFilter, tileInfo)
        const players: RpgPlayer[] = Object.values(this['users'])
        for (let player of players) {
            player.emit('changeTile', tiles)
        }
        return tiles
    }

    getEventShape(eventName: string): RpgShape | undefined {
        return this.getShapes().find(shape => shape.name == eventName)
    }

    /**
     * Dynamically create an event in Shared mode
     * 
     * ```ts
     * @EventData({
     *  name: 'EV-1'
     * })
     * class MyEvent extends RpgEvent {
     *  onAction() {
     *      console.log('ok')
     *  }
     * } 
     *
     * map.createDynamicEvent({
     *      x: 100,
     *      y: 100,
     *      event: MyEvent
     * })
     * ```
     * 
     * You can also put an array of objects to create several events at once
     * 
     * @title Create Dynamic Event
     * @since 3.0.0-beta.4
     * @method map.createDynamicEvent(eventObj|eventObj[])
     * @param { { x: number, y: number, z?: number, event: eventClass } } eventsList
     * @returns { { [eventId: string]: RpgEvent } }
     * @memberof Map
     */
    createDynamicEvent(eventsList: EventPosOption | EventPosOption[]): {
        [eventId: string]: RpgEvent
    } {
        if (!eventsList) return {}
        if (!Utils.isArray(eventsList)) {
            eventsList = [eventsList as EventPosOption]
        }
        const events = this.createEvents(eventsList as EventPosOption[], EventMode.Shared)
        let ret = {}
        for (let key in events) {
            this.events[key] = events[key]
            this.events[key].updateInVirtualGrid()
            this.events[key].execMethod('onInit')
            // force to get Proxy object to sync with client
            ret = { ...ret, [key]: this.events[key] }
        }
        return ret
    }

    /**
     * Get Event in current map
     * @title Get Event
     * @since 3.0.0-beta.7
     * @method map.getEvent(eventId)
     * @param {string} eventId Event Id
     * @returns {RpgEvent | undefined}
     * @memberof Map
     */
    getEvent<T extends RpgEvent>(eventId: string): T | undefined {
        return this.events[eventId] as T
    }

    /**
     * Removes an event from the map. Returns false if the event is not found
     * @title Remove Event
     * @since 3.0.0-beta.4
     * @method map.removeEvent(eventId)
     * @param {string} eventId Event Name
     * @returns {boolean}
     * @memberof Map
     */
    removeEvent(eventId: string): boolean {
        if (!this.events[eventId]) return false
        this.removeObject(this.events[eventId])
        delete this.events[eventId]
        return true
    }

    createEvent(obj: EventPosOption, mode: EventMode, shape?: RpgShape): RpgEvent | null {
        let event: any, position: Position | undefined

        // We retrieve the information of the event ([Event] or [{event: Event, x: number, y: number}])
        if (obj.x === undefined) {
            event = obj
        }
        else {
            event = obj.event
            position = { x: obj.x, y: obj.y, z: 0 }
        }

        // The event is ignored if the mode is different.
        if (event.mode != mode) {
            return null
        }

        // Create an instance of RpgEvent and assign its options
        const ev = this.game.addEvent<RpgEvent>(event)
        const _shape = shape || this.getEventShape(ev.name)
        ev.map = this.id
        ev.server = this._server
        ev.width = event.width || this.tileWidth
        ev.height = event.height || this.tileHeight
        if (_shape && _shape.properties) ev.properties = _shape.properties
        if (event.hitbox) ev.setHitbox(event.hitbox.width, event.hitbox.height)
        ev.teleport(position || ev.name)
        return ev
    }

    createEvents(eventsList: EventOption[], mode: EventMode): EventsList {
        const events = {}

        if (!eventsList) return events

        for (let obj of eventsList) {
            const ev = this.createEvent(obj as EventPosOption, mode)
            if (ev) {
                events[ev.id] = ev
            }
        }

        return events
    }

    /**
     * Allows to create a temporary hitbox on the map that can have a movement
For example, you can use it to explode a bomb and find all the affected players, or during a sword strike, you can create a moving hitbox and find the affected players again
     * @title Create a temporary and moving hitbox
     * @since 3.2.0
     * @method map.createMovingHitbox(hitboxes,options)
     * @param {Array<{ width: number, height: number, x: number, y: number }>} hitboxes Create several hitboxes that will give an effect of movement
     * @param {object} [options]
     * @param {speed} [options.speed=1] speed of movement (in frames)
     * @returns {Observable<AbstractObject>} You find the methods of position and movement of an event
     * @memberof Map
     * @example
     * 
     * ```ts
     * // Two hitboxes that will be done very quickly
     * map.createMovingHitbox(
     *   [ 
     *      { x: 0, y: 0, width: 100, height: 100 },
     *      { x: 20, y: 0, width: 100, height: 100 } 
     *   ]
     * ).subscribe({
     *      next(hitbox) {
     *          console.log(hitbox.otherPlayersCollision)
     *      },
     *      complete() {
     *          console.log('finish')
     *      }
     * })
     * ```
     */
    createMovingHitbox(
        hitboxes: Pick<HitBox, 'width' | 'height' | 'x' | 'y'>[],
        options: MovingHitbox = {}): Observable<AbstractObject> {
        return this._createMovingHitbox<RpgCommonGame>(
            this.game,
            this._server.tick as any,
            this.id,
            hitboxes,
            options) as any
    }

    setSync(schema: any) {
        return this.$setSchema(schema)
    }
}

export interface RpgMap {
    sounds: string[]
    $schema: any
    $setSchema: (schema: any) => void
    $patchSchema: (schema: any) => void
    $snapshotUser: (userId: string) => any
    onLoad()
}