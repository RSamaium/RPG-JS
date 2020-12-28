import { RpgCommonMap, Utils }  from '@rpgjs/common'
import fs from 'fs'
import { Schema } from '@rpgjs/sync-server'
import { RpgPlayer } from '../Player/Player';
import { EventMode } from '../Event';

@Schema({
    users: [RpgPlayer.schemas],
    events: [RpgPlayer.schemas]
})
export class RpgMap extends RpgCommonMap {

    public _events: any
    public id: any
    public file: any 
    public events = {}

    constructor(private _server: any) {
        super()
    }

    async load() {
        if (RpgCommonMap.buffer.has(this.id)) {
            return 
        }
        const data = await this.parseFile() 
        super.load(data) 
        RpgCommonMap.buffer.set(this.id, this)
        this.events = this.createEvents(EventMode.Shared)
        this.onLoad()
    }

    get game() {
        return this._server.gameEngine
    }

    onLoad() {}

    createEvents(mode: EventMode) {
        const events  = {}

        if (!this._events) return events

        for (let obj of this._events) {
            let event: any, position

            // We retrieve the information of the event ([Event] or [{event: Event, x: number, y: number}])
            if (obj.x === undefined) {
                event = obj
            }
            else {
                event = obj.event
                position = { x: obj.x, y: obj.y }
            }

            // The event is ignored if the mode is different.
            if (event.mode != mode) {
                continue
            }

            // Create an instance of RpgEvent and assign its options
            const ev = this.game.addEvent(event, mode == EventMode.Shared)
            ev.width = event.width || this.tileWidth
            ev.height = event.height || this.tileHeight
            if (event.hitbox) ev.setHitbox(event.hitbox.width, event.hitbox.height)
            ev.map = this.id
            ev.teleport(position || ev.name)
            ev.server = this._server

            // We add in the room if shared mode
            if (event.mode == EventMode.Shared) {
                this._server.assignObjectToRoom(ev, this.id)
            }

            ev.execMethod('onInit')

            events[ev.id] = ev
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
}

export interface RpgMap {
    sounds: string[]
}