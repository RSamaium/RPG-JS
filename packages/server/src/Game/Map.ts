import { RpgCommonMap, Utils, RpgShape, RpgCommonGame, AbstractObject } from '@rpgjs/common'
import { TiledParserFile, TiledParser, TiledTileset } from '@rpgjs/tiled'
import { EventData, EventOptions } from '../decorators/event'
import { RpgPlayer, RpgEvent, RpgClassEvent } from '../Player/Player'
import { Move } from '../Player/MoveManager'
import { RpgServerEngine } from '../server'
import { Observable } from 'rxjs'
import path from 'path'
import { HitBox, MovingHitbox, PlayerType, Position } from '@rpgjs/types'
import { World } from 'simple-room'
import { EventManager, EventMode } from './EventManager'

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

    constructor(private _server: RpgServerEngine) {
        super()
        this.events = {}
    }

    // alias of users property in simple-room package
    /**
     * @title Players list
     * @prop { { [playerId: string]: RpgPlayer } } [players]
     * @readonly
     * @memberof Map
     */
    get players(): PlayersList {
        return this['users']
    }

    /**
     * @title Number of players
     * @prop {number} [nbPlayers]
     * @readonly
     * @memberof Map
     */
    get nbPlayers(): number {
        return Object.keys(this.players).length
    }

    $additionalEmitProperties(player: RpgPlayer) {
        const lastFramePositions: {
            frame: number
            position: unknown
        } | undefined = player['_lastFramePositions']
        let pos
        let lastFrame
        if (lastFramePositions) {
            pos = lastFramePositions.position
            lastFrame = lastFramePositions.frame
        }
        const data = { frame: lastFrame, pos }
        return data
    }

    async load() {
        if (RpgCommonMap.buffer.has(this.id)) {
            return
        }
        const data = await this.parseTmx(this.file)
        super.load(data)
        this.getAllObjects().forEach(this.createShape.bind(this))
        this.loadProperties((data as any).properties)
        this._server.workers?.call('loadMap', {
            id: this.id,
            data
        })
        RpgCommonMap.buffer.set(this.id, this)
        this.loadCommonEvents(this._server.inputOptions.events)
        this.createDynamicEvent(this._events as EventPosOption[])
        if (this.onLoad) this.onLoad()
    }

    /**
     * Update the map with new data. Data can be a string (TMX content) or an object (parsed TMX content)
     * New Map data will be sent to all players on the map
     *
     * @title Update map
     * @method map.update(data)
     * @since 4.0.0
     * @returns {Promise<void>}
     * @param {object | string} data
     * @memberof Map
     */
    async update(data: object | string): Promise<void> {
        let objectData
        // Data is XML (TMX content)
        if (typeof data == 'string') {
            objectData = await this.parseTmx(data, this.file)
        }
        else {
            objectData = data
        }
        super.load(objectData)
        RpgCommonMap.buffer.set(this.id, this)
        this.clearShapes()
        this.getAllObjects().forEach(this.createShape.bind(this))
        for (let playerId in this.players) {
            const player = this.players[playerId]
            player.emitSceneMap()
        }
    }

    /**
     * Update tileset with new data. Data can be a string (TSX content) or an object (TiledTileset)
     * Cache will be removed for this tileset
     * New tileset data will be sent to all players on the map
     * Warning: tileset is not updated for all maps, only for the current map
     * 
     * @title Update tileset
     * @method map.updateTileset(data)
     * @since 4.0.0
     * @returns {<void>}
     * @param {TiledTileset | string} data
     * @memberof Map
     */
    updateTileset(data: TiledTileset | string) {
        let objectData: TiledTileset
        // Data is XML (TMX content)
        if (typeof data == 'string') {
            const parser = new TiledParser(data, this.file)
            objectData = parser.parseTileset()
        }
        else {
            objectData = data
        }
        this.removeCacheTileset(objectData.name)
        this.update({
            ...this.data,
            tilesets: this.data.tilesets.map((tileset: any) => {
                if (tileset.name == objectData.name) {
                    objectData.firstgid = tileset.firstgid
                    return objectData
                }
                return tileset
            })
        })
    }

    /**
     * Remove the map from the server. If there are still players on the map, an error will be thrown
     * Not delete the map file, only in memory
     * 
     * @title Remove map
     * @method map.remove()
     * @since 4.0.0
     * @returns {void}
     * @throws {Error} If there are still players on the map
     * @memberof Map
     * */
    remove(ignorePlayers = false): never | void {
        const players = Object.values(this.players)
        if (players.length > 0 && !ignorePlayers) {
            throw new Error(`Cannot remove map ${this.id} because there are still players on it`)
        }
        for (let eventId in this.events) {
            this.removeEvent(eventId)
        }
        RpgCommonMap.buffer.delete(this.id)
        World.removeRoom(this.id)
    }

    private async parseTmx(file: string, relativePath: string = '') {
        // @ts-ignore
        const hasAssetsPath = !!this._server.envs.VITE_BUILT
        const parser = new TiledParserFile(
            file,
            {
                basePath: process.env.NODE_ENV == 'test' ? '.' : '',
                staticDir: hasAssetsPath ? path.join(this._server.inputOptions.basePath, this._server.assetsPath) : '',
                relativePath
            }
        )
        const data = await parser.parseFilePromise({
            getOnlyBasename: hasAssetsPath
        })

        return data
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

    // Hook: called by simple-room package
    onLeave(player: RpgPlayer) {
        this.removeObject(player)
    }

    /**
     * Loads common events onto the game map.
     *
     * @private
     * @param {RpgClassEvent<RpgEvent>[]} commonEvents - An array of common events to load.
     * @param {RpgPlayer} [player] - The player instance on which to create the dynamic events. If not provided, the function will use the current instance.
     * @returns {void}
     */
    // @internal
    loadCommonEvents(commonEvents: RpgClassEvent<RpgEvent>[], player?: RpgPlayer) {
        let events: EventPosOption[] = []
        this.getShapes().forEach(shape => {
            const findEvent = commonEvents.find(event => event._name == shape.name)
            if (!findEvent) return
            const { x, y, } = shape.hitbox
            events.push({
                x,
                y,
                event: findEvent
            })
        });
        if (player) {
            player.createDynamicEvent(events, false)
        }
        else {
            this.createDynamicEvent(events)
        }

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
            this.events[key] = events[key] as any
            this.events[key].updateInVirtualGrid()
            this.events[key].execMethod('onInit')
            // force to get Proxy object to sync with client
            ret = { ...ret, [key]: this.events[key] }
        }
        return ret
    }

    createEvent(obj: EventPosOption, mode: EventMode, shape?: RpgShape): RpgEvent | null {
        let event: any, position: Position | undefined

        // We retrieve the information of the event ([Event] or [{event: Event, x: number, y: number}])
        if (obj.x === undefined) {
            event = obj
        }
        else {
            event = obj.event
            position = { x: obj.x, y: obj.y, z: obj.z ?? 0 }
        }

        if ('$decorator' in event) {
            const options = event.$decorator
            EventData(options)(event)
        }

        // The event is ignored if the mode is different.
        if (event.mode != mode) {
            return null
        }

        // Create an instance of RpgEvent and assign its options
        const ev = this.game.addEvent<RpgEvent>(event)
        const _shape = shape || this.getEventShape(ev.name)
        ev.map = this.id
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

    // Reflects itself. Just for compatibility with the EventManager class
    getCurrentMap() {
        return this
    }
}

export interface RpgMap extends EventManager {
    sounds: string[]
    $schema: any
    $setSchema: (schema: any) => void
    $patchSchema: (schema: any) => void
    $snapshotUser: (userId: string) => any
    onLoad()
    $setCurrentState: (path: string, value: any) => void;
    id: string
}

Utils.applyMixins(RpgMap, [
    EventManager
])