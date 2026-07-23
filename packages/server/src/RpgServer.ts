import { MapOptions } from "./decorators/map"
import { RpgPlayer } from "./Player/Player"
import { type RpgMap } from "./rooms/map"
import type { RpgServerEngine } from "./RpgServerEngine"
import { WorldMapConfig, RpgShape, type I18nMessages, type MapPhysicsInitContext, type MapPhysicsEntityContext, type RpgActionInput } from "@rpgjs/common"
import { RpgEvent } from "./Player/Player"
import type { MaybePromise, RpgMapChangeTarget, RpgPlayerSnapshot, RpgSyncSchema } from "./Player/types"
import type { EventPosOption, RpgTouchContext } from "./rooms/map"
import type { DamageFormulas } from "./Player/BattleManager"
import type { SkillChangePayload } from "./Player/SkillManager"
import type {
    ProjectileDestroyHookContext,
    ProjectileHookContext,
    ProjectileImpactHookContext,
} from "./projectiles"

type RpgClassMap<T> = new () => T
type RpgClassEvent<T> = new () => T
type MatchMakerOption = unknown
type RpgMatchMaker = unknown
type IStoreState = unknown

export type ServerDatabase = Record<string, unknown> | unknown[]

/**
 * Metrics collected after one queued server tick has been processed.
 *
 * The context is runtime-agnostic and can be aggregated before being exported
 * to Cloudflare Analytics Engine, OpenTelemetry, or another metrics backend.
 */
export interface RpgServerStepMetrics {
    /** Current fixed simulation tick after processing the queued delta. */
    tick: number
    /** Wall-clock time spent processing the queued tick, excluding the hook itself. */
    durationMs: number
    /** Delta passed to the queued server tick. */
    scheduledDeltaMs: number
    /** Delta received while this tick was processing and still waiting to run. */
    queuedDeltaMs: number
    /** Number of fixed simulation steps executed for this queued tick. */
    fixedSteps: number
    /** Total number of unprocessed player inputs after this queued tick. */
    pendingInputs: number
}

export interface RpgServerModuleSide {
    client?: unknown
    server?: unknown
}

export type RpgServerModuleImport = RpgServerModuleSide | [RpgServerModuleSide, RpgServerModuleSide]

export interface RpgServerAuthSocket {
    conn: unknown
    request?: unknown
    handshake: {
        query: Record<string, string>
        headers: Record<string, string>
    }
}

/**
 * Interface for world map configuration
 * 
 * Represents a world that contains multiple maps with their spatial relationships.
 * This is typically used with Tiled Map Editor's world files.
 * 
 * @interface WorldMap
 * @example
 * ```ts
 * const worldMap: WorldMap = {
 *   id: 'my-world',
 *   maps: [
 *     { id: 'map1', worldX: 0, worldY: 0, width: 800, height: 600 },
 *     { id: 'map2', worldX: 800, worldY: 0, width: 800, height: 600 }
 *   ]
 * }
 * ```
 */
export interface WorldMap {
  /** Optional world identifier */
  id?: string;
  /** Array of map configurations that belong to this world */
  maps: WorldMapConfig[];
  /** Only show adjacent maps (used by Tiled Map Editor) */
  onlyShowAdjacentMaps?: boolean;
  /** Type identifier (used by Tiled Map Editor, should be 'world') */
  type?: 'world';
}


export interface RpgServerEngineHooks {
    /**
     *  When the server starts
     * 
     * @prop { (engine: RpgServerEngine) => void | Promise<void> } [onStart]
     * @memberof RpgServerEngineHooks
     */
    onStart?: (server: RpgServerEngine) => MaybePromise<void>

    /**
     * After each queued map tick has been processed.
     * 
     * @prop { (engine: RpgServerEngine, metrics: RpgServerStepMetrics) => void | Promise<void> } [onStep]
     * @memberof RpgServerEngineHooks
     */
    onStep?: (
        server: RpgServerEngine,
        metrics: RpgServerStepMetrics,
    ) => MaybePromise<void>

   /**
     * Flexible authentication function for RPGJS.
     * 
     * This `auth` function is an integral part of the connection process in RPGJS, designed to be agnostic 
     * and adaptable to various authentication systems. It is not tied to any specific database or third-party 
     * authentication service, allowing developers to implement custom logic suited to their game's requirements. 
     * This flexibility is particularly useful in MMORPGs where diverse and robust authentication mechanisms may be needed.
     *
     * The function is called during the player connection phase and should handle the verification of player credentials.
     * The implementation can vary widely based on the chosen authentication method (e.g., JWT tokens, OAuth, custom tokens).
     *
     * @param {RpgServerEngine} server - The instance of the game server.
     * @param {SocketIO.Socket} socket - The socket instance for the connecting player. This can be used to access client-sent data, like tokens or other credentials.
     * @returns {Promise<string> | string  | undefined} The function should return a promise that resolves to a player's unique identifier (e.g., user ID) if authentication is successful, or a string representing the user's ID. Alternatively, it can throw an error if authentication fails. If undefined is returned, the player id is generated.
     * @throws {string} Throwing an error will prevent the player from connecting, signifying a failed authentication attempt.
     *
     * @example
     * ```ts
     * // Example of a simple token-based authentication in main/server.ts
     * const server: RpgServerEngineHooks = {
     *     auth(server, socket) {
     *         const token = socket.handshake.query.token;
     *         // Implement your authentication logic here
     *         // Return user ID or throw an error if authentication fails
     *     }
     * };
     * ```
     */
    auth?: (server: RpgServerEngine, socket: RpgServerAuthSocket) => MaybePromise<string | undefined>
}

export interface RpgPlayerHooks {
    /**
     *  Set custom properties on the player. Several interests:
     * 1. The property is shared with the client
     * 2. If you save with `player.save()`, the property will be saved to be reloaded later
     * 3. If you use horizontal scaling, the property will be kept in memory if the player changes the map and this map is on another server
     * 
     * Example:
     * 
     * ```ts
     * import { RpgPlayerHooks } from '@rpgjs/server'
     * 
     * declare module '@rpgjs/server' {
     *  export interface RpgPlayer {
     *      nbWood: number
     *  }
     * }
     * 
     * export const player: RpgPlayerHooks = {
     *  props: {
     *      nbWood: Number
     *  }
     * }
     * ```
     * 
     * This is a simple example. Let's say that the player can have a number of harvested woods, then 
     * 1. you must specify the type for Typescript
     * 2. Add the property in props
     * 
     * You can also set up with this object:
     * 
     * ```
     *  {
            $default: <any> (undefined by default), 
            $syncWithClient: <boolean> (true by default),
            $permanent: <boolean> (true by default)
        }
        ```
     * 
     * - Indicate if the property should be shared with the client
     * 
     * Example:
     * 
     * ```ts
     * export const player: RpgPlayerHooks = {
     *  props: {
     *      secretProp: {
     *          $syncWithClient: false
     *      }
     *  }
     * }
     * ```
     * 
     * - Indicate if the property should be registered in a database. If the data is just temporary to use on the current map:
     * 
     * ```ts
     * export const player: RpgPlayerHooks = {
     *  props: {
     *      tmpProp: {
     *          $permanent: false
     *      }
     *  }
     * }
     * ```
     * 
     * @prop {object} [props]
     * @since 3.0.0-beta.9
     * @memberof RpgPlayerHooks
     */
    props?: RpgSyncSchema

    /**
    *  When the player joins the map
    * 
    * @prop { (player: RpgPlayer, map: RpgMap) => void | Promise<void> } [onJoinMap]
    * @memberof RpgPlayerHooks
    */
    onJoinMap?: (player: RpgPlayer, map: RpgMap) => MaybePromise<void>

    /**
    *  When the player is connected to the server
    * 
    * @prop { (player: RpgPlayer) => void | Promise<void> } [onConnected]
    * @memberof RpgPlayerHooks
    */
    onConnected?: (player: RpgPlayer) => MaybePromise<void>

    /**
    *  When the player starts the game from the lobby
    * 
    * @prop { (player: RpgPlayer) => void | Promise<void> } [onStart]
    * @memberof RpgPlayerHooks
    */
    onStart?: (player: RpgPlayer) => MaybePromise<void>

    /**
    *  When the player presses a key on the client side
    * 
    * @prop { (player: RpgPlayer, input: RpgActionInput<unknown>) => void | Promise<void> } [onInput]
    * @memberof RpgPlayerHooks
    */
    onInput?: (player: RpgPlayer, data: RpgActionInput<unknown>) => MaybePromise<void>

    /**
    *  When the player leaves the map
    * 
    * @prop { (player: RpgPlayer, map: RpgMap) => void | Promise<void> } [onLeaveMap]
    * @memberof RpgPlayerHooks
    */
    onLeaveMap?: (player: RpgPlayer, map: RpgMap) => MaybePromise<void>

    /**
    *  When the player increases one level
    * 
    * @prop { (player: RpgPlayer, nbLevel: number) => void | Promise<void> } [onLevelUp]
    * @memberof RpgPlayerHooks
    */
    onLevelUp?: (player: RpgPlayer, nbLevel: number) => MaybePromise<void>

    /**
    *  When a player learns or forgets a skill
    * 
    * @prop { (player: RpgPlayer, payload: SkillChangePayload) => void | Promise<void> } [onSkillChange]
    * @memberof RpgPlayerHooks
    */
    onSkillChange?: (player: RpgPlayer, payload: SkillChangePayload) => MaybePromise<void>

    /**
    *  When the player's HP drops to 0
    * 
    * @prop { (player: RpgPlayer) => void | Promise<void> } [onDead]
    * @memberof RpgPlayerHooks
    */
    onDead?: (player: RpgPlayer) => MaybePromise<void>,

    /**
    *  When the player leaves the server
    * 
    * @prop { (player: RpgPlayer) => void | Promise<void> } [onDisconnected]
    * @memberof RpgPlayerHooks
    */
    onDisconnected?: (player: RpgPlayer) => MaybePromise<void>

    /**
    *  When the player enters the shape
    * 
    * @prop { (player: RpgPlayer, shape: RpgShape) => void | Promise<void> } [onInShape]
    * 3.0.0-beta.3
    * @memberof RpgPlayerHooks
    */
    onInShape?: (player: RpgPlayer, shape: RpgShape) => MaybePromise<void>

    /**
     *  When the player leaves the shape
     * 
     * @prop { (player: RpgPlayer, shape: RpgShape) => void | Promise<void> } [onOutShape]
     * 3.0.0-beta.3
     * @memberof RpgPlayerHooks
     */
    onOutShape?: (player: RpgPlayer, shape: RpgShape) => MaybePromise<void>

    /**
    * When the x, y positions change
    * 
    * @prop { (player: RpgPlayer) => void | Promise<void> } [onMove]
    * @since 3.0.0-beta.4
    * @memberof RpgPlayerHooks
    */
    onMove?: (player: RpgPlayer) => MaybePromise<void>

    /**
     * Called after a snapshot has been resolved and applied to the player.
     *
     * @prop { (player: RpgPlayer, snapshot: RpgPlayerSnapshot) => void | Promise<void> } [onLoad]
     * @memberof RpgPlayerHooks
     * @example
     * ```ts
     * const player: RpgPlayerHooks = {
     *   onLoad(player, snapshot) {
     *     console.log(player.id, snapshot)
     *   }
     * }
     * ```
     */
    onLoad?: (player: RpgPlayer, snapshot: RpgPlayerSnapshot) => MaybePromise<void>

    /**
     * Called before a snapshot is persisted into a save slot.
     *
     * @prop { (player: RpgPlayer, snapshot: RpgPlayerSnapshot) => void | Promise<void> } [onSave]
     * @memberof RpgPlayerHooks
     * @example
     * ```ts
     * const player: RpgPlayerHooks = {
     *   async onSave(player, snapshot) {
     *     await auditSave(player.id, snapshot)
     *   }
     * }
     * ```
     */
    onSave?: (player: RpgPlayer, snapshot: RpgPlayerSnapshot) => MaybePromise<void>

    /**
    * Allow or prevent the player from switching maps. `nextMap` contains the destination map ID.
    * 
    * @prop { (player: RpgPlayer, nextMap: RpgMapChangeTarget) => boolean | Promise<boolean> } [canChangeMap]
    * @since 3.0.0-beta.8
    * @memberof RpgPlayerHooks
    */
    canChangeMap?: (player: RpgPlayer, nextMap: RpgMapChangeTarget) => MaybePromise<boolean>
}

/**
 * Event hooks interface for handling various event lifecycle methods
 * 
 * @interface RpgEventHooks
 * @since 4.0.0
 */
export interface RpgEventHooks {
    /**
     * Called as soon as the event is created on the map
     * 
     * @param {RpgEvent} event - The event instance being initialized
     * @returns {void | Promise<void>}
     * @memberof RpgEventHooks
     * @example
     * ```ts
     * const eventHooks: RpgEventHooks = {
     *     onInit(event) {
     *         console.log(`Event ${event.name} initialized`)
     *         event.graphic('default-sprite')
     *     }
     * }
     * ```
     */
    onInit?: (event: RpgEvent) => MaybePromise<void>,

    /**
     * Called when the event collides with a player and the player presses the action key
     * 
     * @param {RpgEvent} event - The event being interacted with
     * @param {RpgPlayer} player - The player performing the action
     * @returns {void | Promise<void>}
     * @memberof RpgEventHooks
     * @example
     * ```ts
     * const eventHooks: RpgEventHooks = {
     *     onAction(event, player) {
     *         player.showText('You activated the chest!')
     *         player.addItem('POTION', 1)
     *     }
     * }
     * ```
     */
    onAction?: (event: RpgEvent, player: RpgPlayer, input: RpgActionInput<unknown>) => MaybePromise<void>

    /**
     * Called before an event object is created and added to the map
     * Allows modification of event properties before instantiation
     * 
     * @param {EventPosOption} object - The event object data before creation
     * @param {RpgMap} map - The map where the event will be created
     * @returns {EventPosOption | void | Promise<EventPosOption | void>}
     * @memberof RpgEventHooks
     * @example
     * ```ts
     * const eventHooks: RpgEventHooks = {
     *     onBeforeCreated(object, map) {
     *         // Modify event properties based on map conditions
     *         if (map.id === 'dungeon') {
     *             object.graphic = 'monster-sprite'
     *         }
     *     }
     * }
     * ```
     */
    onBeforeCreated?: (object: EventPosOption, map: RpgMap) => MaybePromise<EventPosOption | void>

    /**
     * Called when a player or another event enters a shape attached to this event
     * 
     * @param {RpgEvent} event - The event with the attached shape
     * @param {RpgPlayer} player - The player entering the shape
     * @param {RpgShape} shape - The shape being entered
     * @returns {void | Promise<void>}
     * @since 4.1.0
     * @memberof RpgEventHooks
     * @example
     * ```ts
     * const eventHooks: RpgEventHooks = {
     *     onDetectInShape(event, player, shape) {
     *         console.log(`Player ${player.name} entered detection zone`)
     *         player.showText('You are being watched...')
     *     }
     * }
     * ```
     */
    onDetectInShape?: (event: RpgEvent, player: RpgPlayer, shape: RpgShape) => MaybePromise<void>

    /**
     * Called when a player or another event leaves a shape attached to this event
     * 
     * @param {RpgEvent} event - The event with the attached shape
     * @param {RpgPlayer} player - The player leaving the shape
     * @param {RpgShape} shape - The shape being left
     * @returns {void | Promise<void>}
     * @since 4.1.0
     * @memberof RpgEventHooks
     * @example
     * ```ts
     * const eventHooks: RpgEventHooks = {
     *     onDetectOutShape(event, player, shape) {
     *         console.log(`Player ${player.name} left detection zone`)
     *         player.showText('You escaped the watch...')
     *     }
     * }
     * ```
     */
    onDetectOutShape?: (event: RpgEvent, player: RpgPlayer, shape: RpgShape) => MaybePromise<void>

    /**
     * Called when the event enters a shape on the map
     * 
     * @param {RpgEvent} event - The event entering the shape
     * @param {RpgShape} shape - The shape being entered
     * @returns {void | Promise<void>}
     * @memberof RpgEventHooks
     * @example
     * ```ts
     * const eventHooks: RpgEventHooks = {
     *     onInShape(event, shape) {
     *         console.log(`Event entered shape: ${shape.id}`)
     *         event.speed = 1 // Slow down in this area
     *     }
     * }
     * ```
     */
    onInShape?: (event: RpgEvent, shape: RpgShape, actor: RpgPlayer | RpgEvent) => MaybePromise<void>

    /**
     * Called when the event leaves a shape on the map
     * 
     * @param {RpgEvent} event - The event leaving the shape
     * @param {RpgShape} shape - The shape being left
     * @returns {void | Promise<void>}
     * @memberof RpgEventHooks
     * @example
     * ```ts
     * const eventHooks: RpgEventHooks = {
     *     onOutShape(event, shape) {
     *         console.log(`Event left shape: ${shape.id}`)
     *         event.speed = 3 // Resume normal speed
     *     }
     * }
     * ```
     */
    onOutShape?: (event: RpgEvent, shape: RpgShape, actor: RpgPlayer | RpgEvent) => MaybePromise<void>

    /**
     * Called when the event collides with a player (without requiring action key press)
     * 
     * @param {RpgEvent} event - The event touching the player
     * @param {RpgPlayer} player - The player being touched
     * @returns {void | Promise<void>}
     * @memberof RpgEventHooks
     * @example
     * ```ts
     * const eventHooks: RpgEventHooks = {
     *     onPlayerTouch(event, player) {
     *         player.hp -= 10 // Damage on touch
     *         player.showText('Ouch! You touched a spike!')
     *     }
     * }
     * ```
     */
    onPlayerTouch?: (event: RpgEvent, player: RpgPlayer) => MaybePromise<void>

    /** Called when an event starts touching a player or another event. */
    onTouch?: (event: RpgEvent, other: RpgPlayer | RpgEvent, context: RpgTouchContext) => MaybePromise<void>

    /** Called when an event stops touching a player or another event. */
    onTouchEnd?: (event: RpgEvent, other: RpgPlayer | RpgEvent, context: RpgTouchContext) => MaybePromise<void>

    /**
     * Called whenever any event on the map (including itself) is executed or changes state
     * Useful for creating reactive events that respond to map state changes
     * 
     * @param {RpgEvent} event - The event listening for changes
     * @param {RpgPlayer} player - The player involved in the change
     * @returns {void | Promise<void>}
     * @memberof RpgEventHooks
     * @example
     * ```ts
     * const eventHooks: RpgEventHooks = {
     *     onChanges(event, player) {
     *         // Change chest graphic based on game state
     *         if (player.getVariable('BATTLE_END')) {
     *             event.graphic('chest-open')
     *         } else {
     *             event.graphic('chest-close')
     *         }
     *     }
     * }
     * ```
     */
    onChanges?: (event: RpgEvent, player: RpgPlayer) => MaybePromise<void>
}

/**
 * Map hooks interface for handling map lifecycle events
 * 
 * These hooks are global hooks that apply to all maps in the game.
 * They are defined in the RpgModule configuration and executed for every map instance.
 * 
 * @interface RpgMapHooks
 * @since 4.0.0
 */
export interface RpgMapHooks {
    /**
     * Called before a map is updated with new data
     * Allows modification of map data before the update is applied
     * 
     * The `mapData` parameter contains the loaded map data (retrieved from request body)
     * You can modify the map before the update is processed
     * 
     * @template T - Type of the incoming map data
     * @template U - Type of the map instance (defaults to RpgMap)
     * @param {T} mapData - The map data loaded from external source (e.g., request body)
     * @param {U} map - The current map instance being updated
     * @returns {U | Promise<U>} The modified map instance or a promise resolving to it
     * @memberof RpgMapHooks
     * @example
     * ```ts
     * const mapHooks: RpgMapHooks = {
     *     onBeforeUpdate(mapData, map) {
     *         // Modify map properties based on incoming data
     *         if (mapData.weather === 'rain') {
     *             map.setWeatherEffect('rain')
     *         }
     *         
     *         // Add custom properties from external data
     *         map.customProperty = mapData.customValue
     *         
     *     }
     * }
     * ```
     * 
     * @example
     * ```ts
     * // Async example with database operations
     * const mapHooks: RpgMapHooks = {
     *     async onBeforeUpdate(mapData, map) {
     *         // Load additional data from database
     *         const additionalData = await database.getMapExtras(map.id)
     *         
     *         // Apply modifications
     *         map.events = [...map.events, ...additionalData.events]
     *         map.npcs = additionalData.npcs
     *         
     *         return map
     *     }
     * }
     * ```
     */
    onBeforeUpdate?: (mapData: unknown, map: RpgMap) => MaybePromise<void>

    /**
     * Called when a map is loaded and initialized
     * 
     * This hook is executed once when the map data is loaded and ready.
     * It applies to all maps globally. Use this to initialize map-specific properties
     * or setup that should happen for every map.
     * 
     * @param {RpgMap} map - The map instance that was loaded
     * @returns {void | Promise<void>}
     * @memberof RpgMapHooks
     * @example
     * ```ts
     * const mapHooks: RpgMapHooks = {
     *     onLoad(map: RpgMap) {
     *         console.log(`Map ${map.id} loaded`)
     *         // Initialize global map properties
     *     }
     * }
     * ```
     */
    onLoad?: (map: RpgMap) => MaybePromise<void>

    /**
     * Called when a player joins any map
     * 
     * This hook is executed each time a player joins any map in the game.
     * It applies globally to all maps. Use this to perform actions that should
     * happen whenever a player enters any map.
     * 
     * @param {RpgPlayer} player - The player joining the map
     * @param {RpgMap} map - The map instance the player joined
     * @returns {void | Promise<void>}
     * @memberof RpgMapHooks
     * @example
     * ```ts
     * const mapHooks: RpgMapHooks = {
     *     onJoin(player: RpgPlayer, map: RpgMap) {
     *         console.log(`${player.name} joined map ${map.id}`)
     *         // Perform global actions when player joins any map
     *     }
     * }
     * ```
     */
    onJoin?: (player: RpgPlayer, map: RpgMap) => MaybePromise<void>

    /**
     * Called when a player leaves any map
     * 
     * This hook is executed each time a player leaves any map in the game.
     * It applies globally to all maps. Use this to perform cleanup or actions
     * that should happen whenever a player exits any map.
     * 
     * @param {RpgPlayer} player - The player leaving the map
     * @param {RpgMap} map - The map instance the player left
     * @returns {void | Promise<void>}
     * @memberof RpgMapHooks
     * @example
     * ```ts
     * const mapHooks: RpgMapHooks = {
     *     onLeave(player: RpgPlayer, map: RpgMap) {
     *         console.log(`${player.name} left map ${map.id}`)
     *         // Perform global cleanup when player leaves any map
     *     }
     * }
     * ```
     */
    onLeave?: (player: RpgPlayer, map: RpgMap) => MaybePromise<void>

    /**
     * Called when the map physics world is initialized.
     *
     * This hook runs each time `loadPhysic()` prepares the physics world, after static
     * map hitboxes are created and before dynamic player/event bodies are hydrated.
     *
     * @param {RpgMap} map - The map instance
     * @param {MapPhysicsInitContext} context - Physics initialization context
     * @returns {void | Promise<void>}
     * @memberof RpgMapHooks
     */
    onPhysicsInit?: (map: RpgMap, context: MapPhysicsInitContext) => MaybePromise<void>

    /**
     * Called when a dynamic character physics body is added to the map.
     *
     * @param {RpgMap} map - The map instance
     * @param {MapPhysicsEntityContext} context - Added entity context
     * @returns {void | Promise<void>}
     * @memberof RpgMapHooks
     */
    onPhysicsEntityAdd?: (map: RpgMap, context: MapPhysicsEntityContext) => MaybePromise<void>

    /**
     * Called when a dynamic character physics body is removed from the map.
     *
     * @param {RpgMap} map - The map instance
     * @param {MapPhysicsEntityContext} context - Removed entity context
     * @returns {void | Promise<void>}
     * @memberof RpgMapHooks
     */
    onPhysicsEntityRemove?: (map: RpgMap, context: MapPhysicsEntityContext) => MaybePromise<void>

    /**
     * Called when the map physics world is reset (before reload).
     *
     * @param {RpgMap} map - The map instance
     * @returns {void | Promise<void>}
     * @memberof RpgMapHooks
     */
    onPhysicsReset?: (map: RpgMap) => MaybePromise<void>
}

export interface RpgProjectileHooks {
    /**
     * Called when a projectile is emitted by `map.projectiles.emit()` or
     * `player.projectiles.emit()`.
     */
    onEmit?: (context: ProjectileHookContext) => MaybePromise<void>

    /**
     * Called when the authoritative server projectile hits an entity or obstacle.
     */
    onImpact?: (context: ProjectileImpactHookContext) => MaybePromise<void>

    /**
     * Called when a projectile is destroyed because it hit something, reached its
     * range, expired, or was removed manually.
     */
    onDestroy?: (context: ProjectileDestroyHookContext) => MaybePromise<void>
}

export interface RpgServer {
    /**
     * Default translations owned by this server module.
     *
     * Game-level translations provided with `provideI18n()` override module
     * translations when they share the same locale and key.
     */
    i18n?: I18nMessages

    /**
     * Add hooks to the player or engine. All modules can listen to the hook
     * 
     * @prop { { player: string[], engine: string[] } } [hooks]
     * @memberof RpgServer
     * @since 4.0.0
     * @stability 1
     * @example
     * 
     * ```ts
     * import { RpgServer } from '@rpgjs/server'
     * import { defineModule } from '@rpgjs/common'
     * 
     * export default defineModule<RpgServer>({
     *     hooks: {
     *        player: ['onAuth']
     *    }
     * })
     * ```
     * 
     * Emit the hook:
     * 
     * ```ts
     * server.module.emit('server.player.onAuth', player)
     * ```
     * 
     * > When we issue a hook, it has to be in form:
     * > `<side>.<property>.<function>`
     * 
     * And listen to the hook:
     * 
     * ```ts
     * import { RpgPlayerHooks, RpgPlayer } from '@rpgjs/server'
     * 
     * const player: RpgPlayerHooks = {
     *    onAuth(player: RpgPlayer) {
     *       console.log('player is authenticated') 
     *   }
     * }
     * ```
     */
    hooks?: {
        player?: string[],
        engine?: string[]
    }
    /**
     * Adding sub-modules
     *
     * @prop { { client: null | Function, server: null | Function }[]} [imports]
     * @memberof RpgServer
     */
    imports?: RpgServerModuleImport[]

    /**
     * Object containing the hooks concerning the engine
     * 
     * ```ts
     * import { RpgServerEngine, RpgServerEngineHooks, RpgServer } from '@rpgjs/server'
     * import { defineModule } from '@rpgjs/common'
     * 
     * const engine: RpgServerEngineHooks = {
     *      onStart(server: RpgServerEngine) {
     *          console.log('server is started')
     *      }
     * }
     * 
     * export default defineModule<RpgServer>({
     *      engine
     * })
     * ```
     * 
     * @prop {RpgServerEngineHooks} [engine]
     * @memberof RpgServer
     */
    engine?: RpgServerEngineHooks

    /** 
     * Give the `player` object hooks. Each time a player connects, an instance of `RpgPlayer` is created.
     * 
     * ```ts
     * import { RpgPlayer, RpgServer, RpgPlayerHooks } from '@rpgjs/server'
     * import { defineModule } from '@rpgjs/common'
     * 
     * const player: RpgPlayerHooks = {
     *      onConnected(player: RpgPlayer) {
     *          
     *      }
     * }
     * 
     * export default defineModule<RpgServer>({
     *      player
     * })
     * ``` 
     * 
     * @prop {RpgClassPlayer<RpgPlayer>} [player]
     * @memberof RpgServer
     * */
    player?: RpgPlayerHooks,

    /** 
     * References all data in the server. it is mainly used to retrieve data according to their identifier
     * 
     * ```ts
     * import { RpgServer } from '@rpgjs/server'
     * import { defineModule } from '@rpgjs/common'
     * import { Potion } from 'my-database/items/potion'
     * 
     * export default defineModule<RpgServer>({
     *      database: {
     *          Potion
     *      }
     * })
     * ``` 
     * 
     * @prop { { [dataName]: data } | (engine: RpgMap) => { [dataName]: data } | Promise<{ [dataName]: data }> } [database]
     * @memberof RpgServer
     * */
    database?: ServerDatabase | ((engine: RpgMap) => MaybePromise<ServerDatabase>),

    /** 
     * Array of all maps. Each element can be either a class (decorated with `@MapData` or not) or a `MapOptions` object
     * 
     * ```ts
     * import { RpgMap, MapData, RpgServer } from '@rpgjs/server'
     * import { defineModule } from '@rpgjs/common'
     * 
     * // Class that extends RpgMap (optional)
     * @MapData({
     *      id: 'town',
     *      file: require('./tmx/mymap.tmx'),
     *      name: 'Town'
     * })
     * class TownMap extends RpgMap { }
     * 
     * // Or a simple class without extending RpgMap
     * @MapData({
     *      id: 'map',
     *      file: '',
     *      events: [{ x: 100, y: 150, event: Event() }]
     * })
     * class SimpleMap {}
     * 
     * export default defineModule<RpgServer>({
     *      maps: [
     *          TownMap,
     *          SimpleMap
     *      ]
     * })
     * ``` 
     * 
     * It is possible to just give the object as well
     * 
     * ```ts
     * import { RpgServer } from '@rpgjs/server'
     * import { defineModule } from '@rpgjs/common'
     * 
     * export default defineModule<RpgServer>({
     *      maps: [
     *          {
     *              id: 'town',
     *              file: require('./tmx/mymap.tmx'),
     *              name: 'Town'
     *          }
     *      ]
     * })
     * ``` 
     * 
     * Since version 3.0.0-beta.8, you can just pass the path to the file. The identifier will then be the name of the file
     * 
     *  ```ts
     * import { RpgServer } from '@rpgjs/server'
     * import { defineModule } from '@rpgjs/common'
     * 
     * export default defineModule<RpgServer>({
     *      maps: [
     *          require('./tmx/mymap.tmx') // id is "mymap"
     *      ]
     * })
     * ``` 
     * 
     * @prop {(RpgClassMap<RpgMap> | MapOptions)[]} [maps]
     * @memberof RpgServer
     * */
    maps?: (RpgClassMap<RpgMap> | MapOptions)[],

    /** 
     * Global map hooks that apply to all maps in the game
     * 
     * These hooks are executed for every map instance and allow you to define
     * global behavior that should happen for all maps. They are different from
     * map-specific hooks defined in `@MapData` which only apply to a specific map class.
     * 
     * ```ts
     * import { RpgServer, RpgMapHooks, RpgMap, RpgPlayer } from '@rpgjs/server'
     * import { defineModule } from '@rpgjs/common'
     * 
     * const mapHooks: RpgMapHooks = {
     *     onLoad(map: RpgMap) {
     *         console.log(`Map ${map.id} loaded`)
     *         // Initialize global map properties
     *     },
     *     onJoin(player: RpgPlayer, map: RpgMap) {
     *         console.log(`${player.name} joined map ${map.id}`)
     *         // Perform global actions when player joins any map
     *     },
     *     onLeave(player: RpgPlayer, map: RpgMap) {
     *         console.log(`${player.name} left map ${map.id}`)
     *         // Perform global cleanup when player leaves any map
     *     },
     *     onBeforeUpdate(mapData, map) {
     *         // Modify map data before update
     *         return map
     *     }
     * }
     * 
     * export default defineModule<RpgServer>({
     *     map: mapHooks
     * })
     * ```
     * 
     * @prop {RpgMapHooks} [map]
     * @memberof RpgServer
     * @since 4.0.0
     * */
    map?: RpgMapHooks

    /**
     * Global projectile hooks.
     *
     * Use these hooks to apply gameplay effects from server-authoritative
     * projectiles without syncing projectile positions every tick.
     */
    projectiles?: RpgProjectileHooks

    event?: RpgEventHooks

    /**
     * Array of all events. Each element is an `RpgEvent` class
     * Events can be used by placing a shape with the name of the event on Tiled Map Editor
     * 
     * @prop {RpgClassEvent<RpgEvent>[]} [events]
     * @since 4.0.0
     * @memberof RpgServer
     */
    events?: RpgClassEvent<RpgEvent>[]

    /**
     * Array of world map configurations
     * 
     * Loads the content of a `.world` file from Tiled Map Editor into the map scene.
     * Each world contains multiple maps with their spatial relationships.
     * 
     * > Note: If a map already exists (i.e. you have already defined an RpgMap), 
     * > the world will retrieve the already existing map. Otherwise it will create a new map.
     * 
     * @prop {WorldMap[]} [worldMaps]
     * @since 3.0.0-beta.8
     * @memberof RpgServer
     * @example
     * ```ts
     * import { RpgServer } from '@rpgjs/server'
     * import { defineModule } from '@rpgjs/common'
     * import myworld from 'myworld.world'
     * 
     * export default defineModule<RpgServer>({
     *     worldMaps: [
     *         myworld
     *     ]
     * })
     * ```
     * 
     * @example
     * ```ts
     * import { RpgServer } from '@rpgjs/server'
     * import { defineModule } from '@rpgjs/common'
     * 
     * // Manual world configuration
     * export default defineModule<RpgServer>({
     *     worldMaps: [
     *         {
     *             id: 'my-world',
     *             maps: [
     *                 {
     *                     id: 'map1',
     *                     worldX: 0,
     *                     worldY: 0,
     *                     width: 800,
     *                     height: 600,
     *                     tileWidth: 32,
     *                     tileHeight: 32
     *                 },
     *                 {
     *                     id: 'map2',
     *                     worldX: 800,
     *                     worldY: 0,
     *                     width: 800,
     *                     height: 600
     *                 }
     *             ]
     *         }
     *     ]
     * })
     * ```
     */
    worldMaps?: WorldMap[]


    /** 
     * Combat formula used in the method player.applyDamage(). There are already formulas in the RPGJS engine but you can customize them
     *  
     * ```ts
     * damageFormulas: {
     *      damageSkill: (a, b, skill) => number,
     *      damagePhysic: (a, b) => number,
     * 
     *      // damage: the damages calculated from the previous formulas
     *      damageCritical: (damage, a, b) => number
     *      coefficientElementsa : (a, b, bDef) => number
     * }
     * ```
     * 
     * `a` represents the attacker's parameters
     * `b` represents the defender's parameters
     * 
     * Example:
     * 
     * ```ts
     * import { RpgServer, Presets } from '@rpgjs/server'
     * import { defineModule } from '@rpgjs/common'
     * 
     * const { ATK, PDEF } = Presets
     * 
     * export default defineModule<RpgServer>({
     *      damageFormulas: {
     *          damagePhysic(a, b) {
     *              let damage = a[ATK] - b[PDEF]
     *              if (damage < 0) damage = 0
     *              return damage
     *          }
     *      }
     * })
     * ```
     * @prop {object} damageFormulas
     * @memberof RpgServer
     * */
    damageFormulas?: DamageFormulas

    /*
    * Scalability configuration for the server
    * @deprecated
    */
    scalability?: {
        matchMaker: MatchMakerOption,
        stateStore: IStoreState
        hooks: {
            onConnected(store: IStoreState, matchMaker: RpgMatchMaker, player: RpgPlayer): Promise<boolean> | boolean
            doChangeServer(store: IStoreState, matchMaker: RpgMatchMaker, player: RpgPlayer): Promise<boolean> | boolean
        }
    }

    throttleSync?: number
    throttleStorage?: number
    sessionExpiryTime?: number
}
