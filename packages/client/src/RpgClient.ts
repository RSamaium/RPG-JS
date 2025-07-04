import { ComponentFunction, Signal } from 'canvasengine'
import { RpgClientEngine } from './RpgClientEngine'
import { Loader, Container } from 'pixi.js'
import { RpgClientObject } from './Game/Object'

type RpgClass<T = any> = new (...args: any[]) => T
type RpgComponent = RpgClientObject
type SceneMap = Container

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
     * @prop { (engine: RpgClientEngine, obj: { input: string, playerId: number }) => any } [onInput]
     * @memberof RpgEngineHooks
     */
    onInput?: (engine: RpgClientEngine, obj: { input: string, playerId: number }) => any

    /**
     * Called when the user is connected to the server
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
     * Called when there was a connection error
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
    componentsBehind?: ComponentFunction[]
    
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
    componentsInFront?: ComponentFunction[]
    
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
     * Before the scene is loaded
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
     * The map and resources are being loaded
     * 
     * @prop { (scene: RpgSceneMap, loader: PIXI.Loader) => any } [onMapLoading]
     * @memberof RpgSceneHooks
     */
    onMapLoading?: (scene: SceneMap, loader: Loader) => any
}

export interface RpgClient {
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
    gui?: ({
        id: string,
        component: ComponentFunction,
        /**
         * Auto display the GUI when added to the system
         * @default false
         */
        autoDisplay?: boolean,
        /**
         * Function that returns an array of Signal dependencies
         * The GUI will only display when all dependencies are resolved (!= undefined)
         */
        dependencies?: () => Signal[]
    } | any)[],

    /** 
     * Array containing the list of sounds
     * Each element is a simple object containing sound definitions
     * 
     * ```ts
     * import { defineModule, RpgClient } from '@rpgjs/client'
     * 
     * defineModule<RpgClient>({
     *      sounds: [
     *          {
     *              town: require('./assets/Town_Theme.ogg'),
     *              battle: require('./assets/Battle_Theme.ogg')
     *          }
     *      ]
     * })
     * ```
     * 
     * @prop {Array<Object>} [sounds]
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
     * Reference the scenes of the game. Here you can put your own class that inherits RpgSceneMap
     * 
     * ```ts
     * import { RpgSceneMapHooks, RpgClient, defineModule } from '@rpgjs/client'
     * 
     * export const sceneMap: RpgSceneMapHooks = {
     *     
     * }
     * 
     * defineModule<RpgClient>({
     *      scenes: {
     *          // If you put the RpgSceneMap scene, Thhe key is called mandatory `map`
     *          map: sceneMap
     *      }
     * })
     * ``` 
     * 
     * @prop { [sceneName: string]: RpgSceneMapHooks } [scenes]
     * @memberof RpgClient
     * */
    scenes?: {
        map: RpgSceneMapHooks
    }

    sceneMap?: RpgSceneMapHooks

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
}