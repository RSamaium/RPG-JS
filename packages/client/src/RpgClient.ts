import { RpgSprite } from './Sprite/Player'
import { ModuleType } from '@rpgjs/common'
import { Scene } from './Scene/Scene'
import { SceneMap } from './Scene/Map'
import { RpgClientEngine } from './RpgClientEngine'

export interface RpgClientEngineHooks {
    /**
     * When the engine is started. If you send false, you prevent the client from connecting to the server
     * 
     * @prop { (engine: RpgClientEngine) => boolean | any } [onStart]
     * @memberof RpgEngineHooks
     */
    onStart?: (engine: RpgClientEngine) => any

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
     * As soon as the sprite is initialized
     * 
     * @prop { (sprite: RpgSprite) => any } [onInit]
     * @memberof RpgSpriteHooks
     */
    onInit?: (sprite: RpgSprite) => any

    /**
     * Called when the sprite is deleted
     * 
     * @prop { (sprite: RpgSprite) => any } [onDestroy]
     * @memberof RpgSpriteHooks
     */
    onDestroy?: (sprite: RpgSprite) => any

    /**
     * As soon as a data is changed on the server side (the name for example), you are able to know the new data but also the old data.
     * 
     * @prop { (sprite: RpgSprite, data: any, old: any) => any } [onChanges]
     * @memberof RpgSpriteHooks
     */
    onChanges?: (sprite: RpgSprite, data: any, old: any) => any

    /**
     * At each tick, the method is called
     * 
     * @prop { (sprite: RpgSprite, obj: any) => any } [onUpdate]
     * @memberof RpgSpriteHooks
     */
    onUpdate?: (sprite: RpgSprite, obj: any) => any

    /**
     * When the x, y positions change
     * 
     * @prop { (sprite: RpgSprite) => any } [onMove]
     * @since 3.0.0-beta.4
     * @memberof RpgSpriteHooks
     */
    onMove?: (sprite: RpgSprite) => any
}

export interface RpgSceneHooks<Scene> {
     /**
     * a sprite has been added on the scene
     * 
     * @prop { (scene: RpgScene, sprite: RpgSprite) => any } [onAddSprite]
     * @memberof RpgSceneHooks
     */
    onAddSprite?: (scene: Scene, sprite: RpgSprite) => any

     /**
     * a sprite has been removed on the scene
     * 
     * @prop { (scene: RpgScene, sprite: RpgSprite) => any } [onRemoveSprite]
     * @memberof RpgSceneHooks
     */
    onRemoveSprite?: (scene: Scene, sprite: RpgSprite) => any

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
    onMapLoading?: (scene: SceneMap, loader: PIXI.Loader) => any
}

export interface RpgClient {
    /**
     * Adding sub-modules
     * 
     * @prop { { client: null | Function, server: null | Function }[]} [imports]
     * @memberof RpgClient
     */
    imports?: ModuleType[]

    /**
     * Object containing the hooks concerning the engine
     * 
     * ```ts
     * import { RpgClientEngine, RpgClientEngineHooks, RpgModule, RpgClient } from '@rpgjs/client'
     * 
     * const engine: RpgClientEngineHooks = {
     *      onConnected(engine: RpgClientEngine) {
     *          console.log('client is connected')
     *      }
     * }
     * 
     * @RpgModule<RpgClient>({
     *      engine
     * })
     * class RpgClientModule {}
     * ```
     * 
     * @prop {RpgClientEngineHooks} [engine]
     * @memberof RpgClient
     */
    engine?: RpgClientEngineHooks

    /** 
     * Array containing the list of spritesheets
     * An element contains a class with the `@Spritesheet` decorator
     * 
     * ```ts
     * import { Spritesheet, Animation, Direction, RpgClient, RpgModule } from '@rpgjs/client'
     * 
     * @Spritesheet({
     *      id: 'chest',
     *      image: require('./assets/chest.png'),
     *      // other options
     * })
     * class Chest  { }
     * 
     * @RpgModule<RpgClient>({
     *      spritesheets: [
     *          Chest
     *      ]
     * })
     * class RpgClientEngine {}
     * ```
     * 
     * [Guide: Create Sprite](/guide/create-sprite.html)
     * 
     * @prop {Array<Class>} [spritesheets]
     * @memberof RpgClient
     * */
    spritesheets?: any[],

    /** 
     * Array containing the list of VueJS components
     * 
     * ```ts
     * import { RpgClient, RpgModule } from '@rpgjs/client'
     * 
     * const component = {
     *      name: 'my-gui',
     *      template: `
     *          <div>
     *              Component
     *          </div>
     *      `
     * }
     * 
     * @RpgModule<RpgClient>({
     *      gui: [
     *          component
     *      ]
     * })
     * class RpgClientEngine {}
     * ```
     * 
     * [Guide: Create GUI](/guide/create-gui.html)
     * 
     * @prop {Array<Component of VueJS>} [gui]
     * @memberof RpgClient
     * */
    gui?: any[],

    /** 
     * Array containing the list of sounds
     * An element contains a class with the `@Sound` decorator
     * 
     * ```ts
     * import { Sound, RpgModule, RpgClient } from '@rpgjs/client'
     * 
     * @Sound({
     *      sounds: {
     *          town: require('./assets/Town_Theme.ogg')
     *      }
     * })
     * class Sounds {}
     * 
     * @RpgModule<RpgClient>({
     *      sounds: [ Sounds ]
     * })
     * class RpgClientEngine {}
     * ```
     * 
     * @prop {Array<Class>} [sounds]
     * @memberof RpgClient
     * */
    sounds?: any[],

    /** 
     * Give the `RpgSprite` class. A Sprite represents a player or an event
     * 
     * ```ts
     * import { RpgSprite, RpgSpriteHooks, RpgClient, RpgModule } from '@rpgjs/client'
     * 
     * export const sprite: RpgSpriteHooks = {
     *    onInit(sprite: RpgSprite) {}
     * }
     * 
     * @RpgModule<RpgClient>({
     *      sprite
     * })
     * class RpgClientEngine {}
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
     * import { RpgSceneMapHooks, RpgClient, RpgModule } from '@rpgjs/client'
     * 
     * export const sceneMap: RpgSceneMapHooks = {
     *     
     * }
     * 
     * @RpgModule<RpgClient>({
     *      scenes: {
     *          // If you put the RpgSceneMap scene, Thhe key is called mandatory `map`
     *          map: sceneMap
     *      }
     * })
     * class RpgClientEngine {}
     * ``` 
     * 
     * @prop { [sceneName: string]: RpgSceneMapHooks } [scenes]
     * @memberof RpgClient
     * */
    scenes?: {
        map: RpgSceneMapHooks
    }
}