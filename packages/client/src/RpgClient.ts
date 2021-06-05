import { RpgSprite } from './Sprite/Player'
import { ModuleType } from '@rpgjs/common'
import { Scene } from './Scene/Scene'

export interface RpgSpriteHooks {
    onInit?: (sprite: RpgSprite) => any
    onDestroy?: (sprite: RpgSprite) => any
    onChanges?: (sprite: RpgSprite, data: any, old: any) => any
    onUpdate?: (sprite: RpgSprite, obj: any) => any
    onMove?: (sprite: RpgSprite) => any
}

export interface RpgSceneHooks {
    onAddSprite?: (scene: Scene, sprite: RpgSprite) => any
    onRemoveSprite?: (scene: Scene, sprite: RpgSprite) => any
    onBeforeLoading?: (scene: Scene) => any
    onAfterLoading?: (scene: Scene) => any
    onChanges?: (scene: Scene, obj: { data: any, partial: any }) => any
    onDraw?: (scene: Scene, t: number) => any
}

export interface RpgSceneMapHooks extends RpgSceneHooks {
    onMapLoading?: (scene: Scene) => any
}

export interface RpgClient {
    /**
     * Adding sub-modules
     * 
     * @todo
     * @prop { { client: null | Function, server: null | Function }[]} [imports]
     * @memberof RpgClient
     */
    imports?: ModuleType[]

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
     * @prop {RpgClass<RpgSprite>} [spriteClass]
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
     * @prop { [sceneName: string]: Class of RpgSceneMap } [scenes]
     * @memberof RpgClient
     * */
    scenes?: {
        map: RpgSceneMapHooks
    }
}