import { RpgCommonMap, Utils, RpgShape }  from '@rpgjs/common'
import * as Kompute from 'kompute/build/Kompute'
import fs from 'fs'
import * as YUKA from 'yuka'
import { EventOptions } from '../decorators/event'
import { EventMode, RpgEvent } from '../Event'
import { Move } from '../Player/MoveManager'
import { RpgPlayer } from '../Player/Player'
import { RpgServerEngine } from '../server'

export type EventPosOption = {
    x: number,
    y: number,
    z?: number,
    event: EventOptions
}
export type EventOption = EventPosOption | EventOptions

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
            this.infiniteMoveRoute([ Move.tileRandom() ])
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
     /** 
     * @title map id
     * @readonly
     * @prop {string} [id]
     * @memberof Map
     * */
    readonly id: string
    public file: any 
     /** 
     * @title event list
     * @prop { { [eventId: string]: RpgEvent } } [events]
     * @memberof Map
     * */
    public events: { 
        [eventId: string]: RpgEvent
    } = {}
    kWorld: Kompute
    entityManager = new YUKA.EntityManager()

    constructor(private _server: RpgServerEngine) {
        super()
    }

    async load() {
        if (RpgCommonMap.buffer.has(this.id)) {
            return 
        }
        const data = await this.parseFile() 
        super.load(data) 
        RpgCommonMap.buffer.set(this.id, this)
        this.createDynamicEvent(this._events as EventPosOption[])
        this.onLoad()
    }

    get game() {
        return this._server.gameEngine
    }

    onLoad() {}

    onJoin(player: RpgPlayer) {
        this.entityManager.add(player.steerable)
    }

    onLeave(player: RpgPlayer) {
        player.stopBehavior()
        this.entityManager.remove(player.steerable)
        this.getShapes().forEach(shape => shape.out(player))
        const events: RpgPlayer[] = this.game.world.getObjectsOfGroup(this.id, player)
        for (let event of events) {
            player.getShapes().forEach(shape => shape.out(event))
            event.getShapes().forEach(shape => shape.out(player))
        }
    }

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

    // TODO: return type
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
        if (!eventsList) return  {}
        if (!Utils.isArray(eventsList)) {
            eventsList = [eventsList as EventPosOption]
        }
        const events = this.createEvents(eventsList as EventPosOption[], EventMode.Shared)
        for (let key in events) {
            this.events[key] = events[key]
            this.events[key].execMethod('onInit')
        }
        return events
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
        delete this.events[eventId]
        return true
    }

    createEvent(obj: EventPosOption, mode: EventMode, shape?: any): RpgEvent | null {
        let event: any, position
        
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
        const ev = this.game.addEvent(event, mode == EventMode.Shared)
        const _shape = shape || this.getEventShape(ev.name)

        this.entityManager.add(ev.steerable)

        ev.width = event.width || this.tileWidth
        ev.height = event.height || this.tileHeight
        if (_shape && _shape.properties) ev.properties = _shape.properties
        if (event.hitbox) ev.setHitbox(event.hitbox.width, event.hitbox.height)
        ev.map = this.id
        ev.teleport(position || ev.name)
        ev.server = this._server
        return ev
    }

    createEvents(eventsList: EventOption[], mode: EventMode): { 
        [eventId: string]: RpgEvent
    } {
        const events  = {}

        if (!eventsList) return events

        for (let obj of eventsList) {
            const ev = this.createEvent(obj as EventPosOption, mode)
            if (ev) {
                events[ev.id] = ev
            }
        }

        return events
    }

    parseFile() {   
        if (this.file.version) {
            return Promise.resolve(this.file)
        }

        if (Utils.isBrowser()) {
            return fetch(this.file)
                .then(res => res.json())
        }

        const filepath = this._server.inputOptions.basePath + '/' + this.file
        
        return new Promise((resolve, reject) => {
            fs.readFile(filepath, 'utf-8', (err, data) => {
                if (err) return reject(err)
                resolve(JSON.parse(data))
            })
        })
    }

    setSync(schema: any) {
        return this.$setSchema(schema)
    }
}

export interface RpgMap {
    sounds: string[]
    $setSchema: (schema: any) => void
}