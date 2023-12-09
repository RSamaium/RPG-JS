import { PlayerType } from "@rpgjs/types"
import { RpgEvent, RpgPlayer } from "../Player/Player"
import { RpgMap } from "./Map"

export type EventsList = {
    [playerId: string]: RpgEvent
}

export enum EventMode {
    Shared = 'shared',
    Scenario = 'scenario'
}

/**
 *  ⚠️ Please note that the event system can be on the player or on the card.
 * On player, it's Scenario mode
 * On-map: Shared mode
 * So this here is either RpgMap or RpgPlayer
 * You can check the mode with the mode cleanup on the retrieved event
 */
export class EventManager {
    /** 
   * @title event list
   * @prop { { [eventId: string]: RpgEvent } } [events]
   * @memberof Map
   * */
    public events: EventsList

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

    getEventByName<T extends RpgEvent>(eventName: string): T | undefined {
        const events = Object.keys(this.events)
        const key = events.find(key => this.events[key].name == eventName)
        if (!key) return
        return this.events[key] as T
    }

    /**
    * Removes an event from the map. Returns false if the event is not found
    * 
    * Deletion of an event forced to be performed at the end of several aynschronous notions
    * 
    * @title Remove Event
    * @since 3.0.0-beta.4
    * @method map.removeEvent(eventId)
    * @param {string} eventId Event Name
    * @returns {boolean}
    * @memberof Map
    */
    removeEvent(eventId: string): boolean {
        if (!this.events[eventId]) return false
        const mode = this.events[eventId].mode
        let currentState
        // Restores previous state 
        if (mode == EventMode.Scenario) {
            currentState = this.getCurrentMap()?.$currentState().users?.[this.id]?.events?.[eventId] ?? {}
        }
        else {
            currentState = this.$currentState().events?.[eventId] ?? {}
        }
        this.removeObject(this.events[eventId], mode)
        delete this.events[eventId]
        // Change the state of the packet that will be sent to the client, adding the deleted flag to indicate to the client that the event has been deleted.
        if (mode == EventMode.Scenario) {
            this.getCurrentMap()?.$setCurrentState(`users.${this.id}.events.${eventId}`, {
                ...currentState,
                deleted: true
            })
        }
        else {
            this.$setCurrentState(`events.${eventId}`, {
                ...currentState,
                deleted: true
            })
        }
        return true
    }

    // @internal
    removeObject(object: RpgPlayer | RpgEvent, mode: EventMode = EventMode.Shared) {
        const map = this.getCurrentMap()
        if (!map) return
        map.getShapes().forEach(shape => shape.out(object))
        const events: RpgPlayer[] = Object.values(map.game.world.getObjectsOfGroup(map.id, object))
        for (let event of events) {
            object.getShapes().forEach(shape => shape.out(event))
            event.getShapes().forEach(shape => shape.out(object))
        }
        object._destroy$.next()
        object._destroy$.complete()
        // force RXJS, close subject. TODO: avoid this
        if (object.type != PlayerType.Player) object._destroy$['_closed'] = true
        map.grid.clearObjectInCells(object.id)
        for (let playerId in map.players) {
            if (object.id == playerId) continue
            const otherPlayer = map.players[playerId]
            if (otherPlayer.followingId == object.id) {
                otherPlayer.cameraFollow(otherPlayer)
            }
        }
        // last player before removed of this map 
        if (map.nbPlayers === 1 && object.type === PlayerType.Player) {
            // clear cache for this map
            map.remove(true)
        }
    }
}

export interface EventManager {
    getCurrentMap(): RpgMap | null
    id: string
    $setCurrentState: (path: string, value: any) => void;
    $currentState(): any
}