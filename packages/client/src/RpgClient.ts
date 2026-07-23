import { ComponentFunction, Signal } from 'canvasengine'
import { RpgClientEngine } from './RpgClientEngine'
import { Loader, Container } from 'pixi.js'
import { RpgClientObject } from './Game/Object'
import type { RpgClientEvent } from './Game/Event'
import { type I18nMessages, type MapPhysicsEntityContext, type MapPhysicsInitContext, type RpgActionName } from '@rpgjs/common'
import type {
    ClientProjectileSpawn,
    RenderedProjectileProps,
} from './Game/ProjectileManager'
import type { ClientVisualMap } from './Game/ClientVisuals'
import type {
    RpgInteractionBehavior,
    RpgInteractionMatcher,
} from './services/interactions'
import type { GuiEntry } from './Gui/Gui'

type RpgClass<T = any> = new (...args: any[]) => T
type RpgComponent = RpgClientObject
type SceneMap = Container
export type SpriteComponentConfig = ComponentFunction | {
    component: ComponentFunction
    props?: Record<string, any> | ((object: RpgClientObject) => Record<string, any>)
    data?: Record<string, any> | ((object: RpgClientObject) => Record<string, any>)
    dependencies?: (object: RpgClientObject) => any[]
}

export type EventComponentSprite = RpgClientEvent & Record<string, any>

export type EventComponentConfig = ComponentFunction | {
    component: ComponentFunction
    props?: Record<string, any> | ((event: EventComponentSprite) => Record<string, any>)
    data?: Record<string, any> | ((event: EventComponentSprite) => Record<string, any>)
    dependencies?: (event: EventComponentSprite) => any[]
    renderGraphic?: boolean
}

export interface RpgSpriteBeforeRemoveContext {
    reason?: string
    data?: any
    transition?: {
        animation?: string
        graphic?: string | string[]
        duration?: number
        effect?: string
    }
    timeoutMs?: number
}

export interface RpgClientEngineHooks {
    /**
     * When the engine is started. If you send false, you prevent the client from connecting to the server
     * 
     * @prop { (engine: RpgClientEngine) => boolean | any } [onStart]
     * @memberof RpgEngineHooks
     */
    onStart?: (engine: RpgClientEngine) => boolean | void | Promise<boolean | void>

    /**
     * Each frame
     * 
     * @prop { (engine: RpgClientEngine, t: number) => boolean | any } [onStep]
     * @memberof RpgEngineHooks
     */
     onStep?: (engine: RpgClientEngine, t?: number, dt?: number) => any

    /**
     * Recover keys from the pressed keyboard
     * 
     * @prop { (engine: RpgClientEngine, obj: { input: string | number, action?: string | number, data?: any, playerId: number }) => any } [onInput]
     * @memberof RpgEngineHooks
     */
    onInput?: (engine: RpgClientEngine, obj: { input: RpgActionName, action?: RpgActionName, data?: any, playerId: number }) => any

    /**
     * Called when the user is connected to the server. In MMORPG mode, this
     * runs after the server sends the RPGJS connection acceptance packet.
     * 
     * @prop { (engine: RpgClientEngine, socket: any) => any } [onConnected]
     * @memberof RpgEngineHooks
     */
    onConnected?: (engine: RpgClientEngine, socket: any) => any

    /**
     * Called when the user is disconnected to the server
     * 
     * @prop { (engine: RpgClientEngine, reason: any, socket: any) => any } [onDisconnect]
     * @memberof RpgEngineHooks
     */
    onDisconnect?: (engine: RpgClientEngine, reason: any, socket: any) => any

    /**
     * Called when there was a connection error. In MMORPG mode, this also runs
     * when server-side auth refuses the connection.
     * 
     * @prop { (engine: RpgClientEngine, err: any, socket: any) => any } [onConnectError]
     * @memberof RpgEngineHooks
     */
    onConnectError?: (engine: RpgClientEngine, err: any, socket: any) => any

    /**
     * Called when window is resized
     * 
     * @prop { () => any } [onWindowResize]
     * @since 3.0.0-beta.4
     * @memberof RpgEngineHooks
     */
    onWindowResize?: () => any
}

export interface RpgSpriteHooks {
    /**
     * Array of components to render behind the sprite
     * These components will be displayed with a lower z-index than the sprite itself
     * 
     * @prop { ComponentFunction[] } [componentsBehind]
     * @memberof RpgSpriteHooks
     * @example
     * ```ts
     * const sprite: RpgSpriteHooks = {
     *   componentsBehind: [ShadowComponent, AuraComponent]
     * }
     * ```
     */
    componentsBehind?: SpriteComponentConfig[]
    
    /**
     * Array of components to render in front of the sprite
     * These components will be displayed with a higher z-index than the sprite itself
     * 
     * @prop { ComponentFunction[] } [componentsInFront]
     * @memberof RpgSpriteHooks
     * @example
     * ```ts
     * const sprite: RpgSpriteHooks = {
     *   componentsInFront: [HealthBarComponent, StatusEffectComponent]
     * }
     * ```
     */
    componentsInFront?: SpriteComponentConfig[]

    /**
     * Reusable sprite components addressable by server-side component definitions.
     *
     * The server sends only the component id and serializable props. The client
     * registry maps that id to the CanvasEngine component that renders it.
     *
     * @prop {Record<string, ComponentFunction>} [components]
     * @memberof RpgSpriteHooks
     * @example
     * ```ts
     * import GuildBadge from './components/guild-badge.ce'
     *
     * const sprite: RpgSpriteHooks = {
     *   components: {
     *     guildBadge: GuildBadge
     *   }
     * }
     * ```
     */
    components?: Record<string, ComponentFunction>

    /**
     * Resolve a custom CanvasEngine component for a specific event.
     *
     * The component always receives the synced event object as the `sprite` prop.
     * Custom props are merged in addition to `sprite`, but cannot replace it.
     * Return `null` or `undefined` to keep the default graphic renderer.
     *
     * @prop { (event: EventComponentSprite) => EventComponentConfig | null | undefined } [eventComponent]
     * @memberof RpgSpriteHooks
     * @example
     * ```ts
     * import ChestEvent from './components/chest-event.ce'
     *
     * const sprite: RpgSpriteHooks = {
     *   eventComponent(sprite) {
     *     if (sprite.name === 'CHEST') {
     *       return ChestEvent
     *     }
     *     return null
     *   }
     * }
     * ```
     */
    eventComponent?: (event: EventComponentSprite) => EventComponentConfig | null | undefined
    
    /**
     * As soon as the sprite is initialized
     * 
     * @prop { (sprite: RpgSprite) => any } [onInit]
     * @memberof RpgSpriteHooks
     */
    onInit?: (sprite: RpgComponent) => any

    /**
     * Called when the sprite is deleted
     * 
     * @prop { (sprite: RpgSprite) => any } [onDestroy]
     * @memberof RpgSpriteHooks
     */
    onDestroy?: (sprite: RpgComponent) => any

    /**
     * Called when a sprite removal is requested, before it disappears from the scene.
     *
     * Return a promise to keep the sprite visible while an animation, effect, or
     * sound transition is running. The server still owns gameplay removal and
     * uses the timeout carried by the remove request as a safety limit.
     *
     * @prop { (sprite: RpgSprite, context: RpgSpriteBeforeRemoveContext) => any } [onBeforeRemove]
     * @memberof RpgSpriteHooks
     */
    onBeforeRemove?: (
        sprite: RpgComponent,
        context: RpgSpriteBeforeRemoveContext
    ) => any

    /**
     * As soon as a data is changed on the server side (the name for example), you are able to know the new data but also the old data.
     * 
     * @prop { (sprite: RpgSprite, data: any, old: any) => any } [onChanges]
     * @memberof RpgSpriteHooks
     */
    onChanges?: (sprite: RpgComponent, data: any, old: any) => any

    /**
     * At each tick, the method is called
     * 
     * @prop { (sprite: RpgSprite, obj: any) => any } [onUpdate]
     * @memberof RpgSpriteHooks
     */
    onUpdate?: (sprite: RpgComponent, obj: any) => any

    /**
     * When the x, y positions change
     * 
     * @prop { (sprite: RpgSprite) => any } [onMove]
     * @since 3.0.0-beta.4
     * @memberof RpgSpriteHooks
     */
    onMove?: (sprite: RpgComponent) => any
}

export interface RpgSceneHooks<Scene> {
     /**
     * a sprite has been added on the scene
     * 
     * @prop { (scene: RpgScene, sprite: RpgComponent) => any } [onAddSprite]
     * @memberof RpgSceneHooks
     */
    onAddSprite?: (scene: Scene, sprite: RpgComponent) => any

     /**
     * a sprite has been removed on the scene
     * 
     * @prop { (scene: RpgScene, sprite: RpgSprite) => any } [onRemoveSprite]
     * @memberof RpgSceneHooks
     */
    onRemoveSprite?: (scene: Scene, sprite: RpgComponent) => any

     /**
     * Before the scene is loaded. Async hooks are awaited while the previous
     * scene is still mounted, allowing transition UI to cover it before teardown.
     * 
     * @prop { (scene: RpgScene) => any } [onBeforeLoading]
     * @memberof RpgSceneHooks
     */
    onBeforeLoading?: (scene: Scene) => any

     /**
     *  When the scene is loaded (Image of the loaded tileset, drawing completed and viewport assigned)
     * 
     * @prop { (scene: RpgScene) => any } [onAfterLoading]
     * @memberof RpgSceneHooks
     */
    onAfterLoading?: (scene: Scene) => any

     /**
     * When server data changes on the map (events, players, or other)
     * 
     * @prop { (scene: RpgScene, obj: { data: any, partial: any }) => any } [onChanges]
     * @memberof RpgSceneHooks
     */
    onChanges?: (scene: Scene, obj: { data: any, partial: any }) => any

     /**
     *  the scene is drawn
     * 
     * @prop { (scene: RpgScene, t: number) => any } [onDraw]
     * @memberof RpgSceneHooks
     */
    onDraw?: (scene: Scene, t: number) => any
}

export interface RpgSceneMapHooks extends RpgSceneHooks<SceneMap> {
    /**
     * Root CanvasEngine component used to render the RPG scene map.
     *
     * Use the exported `SceneMap` component inside your custom component to
     * keep the default map rendering and compose additional scene children.
     */
    component?: ComponentFunction

    /**
     * The map and resources are being loaded
     * 
     * @prop { (scene: RpgSceneMap, loader: PIXI.Loader) => any } [onMapLoading]
     * @memberof RpgSceneHooks
     */
    onMapLoading?: (scene: SceneMap, loader: Loader) => any

    /**
     * Called when client physics has been initialized for the current map.
     *
     * Use this hook to initialize shared physics extensions based on map data
     * (for example, tile-based collision rules used by client prediction).
     *
     * @prop { (scene: SceneMap, context: MapPhysicsInitContext) => any } [onPhysicsInit]
     * @memberof RpgSceneMapHooks
     */
    onPhysicsInit?: (scene: SceneMap, context: MapPhysicsInitContext) => any

    /**
     * Called when a character physics body is added to the map.
     *
     * @prop { (scene: SceneMap, context: MapPhysicsEntityContext) => any } [onPhysicsEntityAdd]
     * @memberof RpgSceneMapHooks
     */
    onPhysicsEntityAdd?: (scene: SceneMap, context: MapPhysicsEntityContext) => any

    /**
     * Called when a character physics body is removed from the map.
     *
     * @prop { (scene: SceneMap, context: MapPhysicsEntityContext) => any } [onPhysicsEntityRemove]
     * @memberof RpgSceneMapHooks
     */
    onPhysicsEntityRemove?: (scene: SceneMap, context: MapPhysicsEntityContext) => any

    /**
     * Called when the physics world is reset (e.g. before a map physics reload).
     *
     * @prop { (scene: SceneMap) => any } [onPhysicsReset]
     * @memberof RpgSceneMapHooks
     */
    onPhysicsReset?: (scene: SceneMap) => any
}

export interface RpgProjectileHooks {
    /**
     * CanvasEngine components used to render server-authoritative projectiles.
     */
    components?: Record<string, ComponentFunction>

    /**
     * Called when a projectile spawn batch is received from the server.
     */
    onSpawn?: (projectile: ClientProjectileSpawn) => any

    /**
     * Called when the server confirms a projectile impact.
     */
    onImpact?: (projectile: RenderedProjectileProps | null) => any

    /**
     * Called when the server destroys a projectile.
     */
    onDestroy?: (projectile: RenderedProjectileProps | null) => any
}

export interface RpgClient {
    /**
     * Default translations owned by this client module.
     *
     * Game-level translations provided with `provideI18n()` override module
     * translations when they share the same locale and key.
     */
    i18n?: I18nMessages

    /**
     * Add hooks to the player or engine. All modules can listen to the hook
     * 
     * @prop { { player: string[], engine: string[] } } [hooks]
     * @memberof RpgClient
     * @since 4.0.0
     * @stability 1
     * @example
     * 
     * ```ts
     * import { RpgClient, defineModule } from '@rpgjs/client'
     * 
     * defineModule<RpgClient>({
     *     hooks: {
     *        player: ['onAuth']
     *    }
     * })
     * ```
     * 
     * Emit the hook:
     * 
     * ```ts
     * client.module.emit('client.player.onAuth', sprite)
     * ```
     * 
     * And listen to the hook:
     * 
     * ```ts
     * import { type RpgClientEngineHooks, RpgSprite } from '@rpgjs/client'
     * 
     * const sprite: RpgSpriteHooks = {
     *    onAuth(player: RpgSprite) {
     *       console.log('player is authenticated') 
     *   }
     * }
     * ```
     */
    hooks?: {
        engine?: string[],
        player?: string[],
        sceneMap?: string[],
    }

    /**
     * Adding sub-modules
     * 
     * @prop { { client: null | Function, server: null | Function }[]} [imports]
     * @memberof RpgClient
     */
    imports?: any

    /**
     * Object containing the hooks concerning the engine
     * 
     * ```ts
     * import { RpgClientEngine, RpgClientEngineHooks, defineModule, RpgClient } from '@rpgjs/client'
     * 
     * const engine: RpgClientEngineHooks = {
     *      onConnected(engine: RpgClientEngine) {
     *          console.log('client is connected')
     *      }
     * }
     * 
     * defineModule<RpgClient>({
     *      engine
     * })
     * ```
     * 
     * @prop {RpgClientEngineHooks} [engine]
     * @memberof RpgClient
     */
    engine?: RpgClientEngineHooks

    /** 
     * Array containing the list of spritesheets
     * Each element is a simple object containing spritesheet definitions
     * 
     * ```ts
     * import { defineModule, RpgClient } from '@rpgjs/client'
     * 
     * defineModule<RpgClient>({
     *      spritesheets: [
     *          {
     *              id: 'chest',
     *              image: require('./assets/chest.png'),
     *              framesWidth: 32,
     *              framesHeight: 32,
     *              animations: {
     *                  default: {
     *                      frames: [0, 1, 2],
     *                      duration: 1000
     *                  }
     *              }
     *          }
     *      ]
     * })
     * ```
     * 
     * [Guide: Create Sprite](/guide/create-sprite.html)
     * 
     * @prop {Array<Object>} [spritesheets]
     * @memberof RpgClient
     * */
    spritesheets?: any[],

    /** 
     * Resolver function for dynamically creating spritesheets
     * 
     * This function is called when a spritesheet is requested but not found in the cache.
     * It can be synchronous (returns directly) or asynchronous (returns a Promise).
     * The resolved spritesheet is automatically cached for future use.
     * 
     * ```ts
     * import { defineModule, RpgClient } from '@rpgjs/client'
     * 
     * defineModule<RpgClient>({
     *      spritesheetResolver: (id: string) => {
     *          // Synchronous resolver
     *          if (id === 'dynamic-sprite') {
     *              return {
     *                  id: 'dynamic-sprite',
     *                  image: 'path/to/image.png',
     *                  framesWidth: 32,
     *                  framesHeight: 32
     *              };
     *          }
     *          return undefined;
     *      }
     * })
     * 
     * // Or asynchronous resolver
     * defineModule<RpgClient>({
     *      spritesheetResolver: async (id: string) => {
     *          const response = await fetch(`/api/spritesheets/${id}`);
     *          const data = await response.json();
     *          return data;
     *      }
     * })
     * ```
     * 
     * @prop {(id: string) => any | Promise<any>} [spritesheetResolver]
     * @memberof RpgClient
     * */
    spritesheetResolver?: (id: string) => any | Promise<any>,

    /** 
     * Resolver function for dynamically loading sounds
     * 
     * The resolver is called when a sound is requested but not found in the cache.
     * It can be synchronous (returns directly) or asynchronous (returns a Promise).
     * The resolved sound is automatically cached for future use.
     * 
     * ```ts
     * import { defineModule, RpgClient } from '@rpgjs/client'
     * 
     * defineModule<RpgClient>({
     *     soundResolver: (id: string) => {
     *         if (id === 'dynamic-sound') {
     *             return { id: 'dynamic-sound', src: 'path/to/sound.mp3' };
     *         }
     *         return undefined;
     *     }
     * })
     * ```
     * 
     * @prop {(id: string) => any | Promise<any>} [soundResolver]
     * @memberof RpgClient
     * */
    soundResolver?: (id: string) => any | Promise<any>,

    /** 
     * Array containing the list of GUI components
     * 
     * ```ts
     * import { defineModule, RpgClient } from '@rpgjs/client'
     * import InventoryComponent from './inventory.ce'
     * 
     * defineModule<RpgClient>({
     *      gui: [
     *          {
     *              id: 'inventory',
     *              component: InventoryComponent,
     *              autoDisplay: true,
     *              dependencies: () => [playerSignal, inventorySignal]
     *          }
     *      ]
     * })
     * ```
     * 
     * [Guide: Create GUI](/guide/create-gui.html)
     * 
     * @prop {Array<GuiOptions>} [gui]
     * @memberof RpgClient
     * */
    gui?: GuiEntry[],

    /** 
     * Array containing the list of sounds
     * Each element can be:
     * - A simple object containing sound definitions
     * - A class decorated with @Sound
     * 
     * ```ts
     * import { defineModule, RpgClient, Sound } from '@rpgjs/client'
     * 
     * // Using simple objects
     * defineModule<RpgClient>({
     *      sounds: [
     *          {
     *              id: 'typewriter',
     *              src: 'typewriter.wav'
     *          },
     *          {
     *              id: 'cursor',
     *              src: 'cursor.wav'
     *          }
     *      ]
     * })
     * 
     * // Using @Sound decorator
     * @Sound({
     *     id: 'town-music',
     *     sound: require('./sound/town.ogg'),
     *     loop: true,
     *     volume: 0.5
     * })
     * export class TownMusic {}
     * 
     * defineModule<RpgClient>({
     *      sounds: [TownMusic]
     * })
     * 
     * // Multiple sounds in one class
     * @Sound({
     *     sounds: {
     *         hero: require('./assets/hero.ogg'),
     *         monster: require('./assets/monster.ogg')
     *     },
     *     loop: true
     * })
     * export class CharacterSounds {}
     * 
     * defineModule<RpgClient>({
     *      sounds: [CharacterSounds]
     * })
     * ```
     * 
     * @prop {Array<Object | Class>} [sounds]
     * @memberof RpgClient
     * */
    sounds?: any[],

    /** 
     * Give the `RpgSprite` class. A Sprite represents a player or an event
     * 
     * ```ts
     * import { RpgSprite, RpgSpriteHooks, RpgClient, defineModule } from '@rpgjs/client'
     * 
     * export const sprite: RpgSpriteHooks = {
     *    onInit(sprite: RpgSprite) {}
     * }
     * 
     * defineModule<RpgClient>({
     *      sprite
     * })
     * ``` 
     * 
     * @prop {RpgSpriteHooks} [sprite]
     * @memberof RpgClient
     * */
    sprite?: RpgSpriteHooks

    /**
     * Reference the scenes of the game.
     * 
     * ```ts
     * import { RpgSceneMapHooks, RpgClient, defineModule } from '@rpgjs/client'
     * import MyScene from './my-scene.ce'
     * 
     * export const sceneMap: RpgSceneMapHooks = {
     *     component: MyScene
     * }
     * 
     * defineModule<RpgClient>({
     *      sceneMap
     * })
     * ``` 
     * 
     * @prop {RpgSceneMapHooks} [sceneMap]
     * @memberof RpgClient
     * */
    sceneMap?: RpgSceneMapHooks

    /**
     * Legacy scene map hook container.
     *
     * Prefer `sceneMap` for new code.
     */
    scenes?: {
        map: RpgSceneMapHooks
    }

    /** 
     * Array containing the list of component animations
     * Each element defines a temporary component to display for animations like hits, effects, etc.
     * 
     * ```ts
     * import { defineModule, RpgClient } from '@rpgjs/client'
     * import HitComponent from './hit.ce'
     * import ExplosionComponent from './explosion.ce'
     * 
     * defineModule<RpgClient>({
     *      componentAnimations: [
     *          {
     *              id: 'hit',
     *              component: HitComponent
     *          },
     *          {
     *              id: 'explosion',
     *              component: ExplosionComponent
     *          }
     *      ]
     * })
     * ```
     * 
     * @prop {Array<{id: string, component: ComponentFunction}>} [componentAnimations]
     * @memberof RpgClient
     * */
    componentAnimations?: {
        id: string,
        component: ComponentFunction
    }[]

    /**
     * Named client-side visual macros.
     *
     * Use client visuals when the server needs to trigger a group of existing
     * client visual primitives at once, such as a flash, damage text, sound,
     * component animation, and camera shake. The server sends only the visual
     * name and a serializable payload; the rendering details live on the client.
     *
     * For a single sound, flash, or component animation, prefer the direct
     * server APIs (`playSound`, `flash`, `showComponentAnimation`). Client
     * visuals are meant to group several visual operations and reduce bandwidth.
     *
     * ```ts
     * import { defineModule, RpgClient } from '@rpgjs/client'
     *
     * export default defineModule<RpgClient>({
     *   clientVisuals: {
     *     hit({ target, data }, helpers) {
     *       helpers.flash(target, { type: 'tint', tint: 'red' })
     *       helpers.showHit(target, `-${data.damage}`)
     *       helpers.sound('hit')
     *     }
     *   }
     * })
     * ```
     *
     * @prop {Record<string, ClientVisualHandler>} [clientVisuals]
     * @memberof RpgClient
     */
    clientVisuals?: ClientVisualMap

    /**
     * Client-side projectile rendering configuration.
     *
     * Register a CanvasEngine component per projectile type. The server sends
     * compact spawn/impact/destroy events and the client predicts x/y locally.
     */
    projectiles?: RpgProjectileHooks

    /**
     * Client-only pointer interactions attached to sprites.
     *
     * Use this for hover popovers, selection, drag previews, cursor changes, and
     * explicit mouse-driven gameplay actions. Pointer feedback stays local unless
     * the behavior calls `ctx.action(...)`.
     */
    interactions?:
        | ((engine: RpgClientEngine) => void)
        | {
            setup?: (engine: RpgClientEngine) => void
            load?: (engine: RpgClientEngine) => void
            use?: Array<[RpgInteractionMatcher, RpgInteractionBehavior | ComponentFunction]>
        }
}
