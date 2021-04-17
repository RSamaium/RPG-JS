import { RpgSprite } from './Sprite/Player'
import { Plugin } from '@rpgjs/common'

interface RpgClass<T> {
    new (data: any, scene: any): T,
}

interface RpgClientOptions {
     /** 
     * The element selector that will display the canvas. By default, `#rpg`
     * 
     * @prop {string} [selector]
     * @memberof RpgClient
     * */
    selector?: string,

    /** 
     * The selector that corresponds to the GUIs. By default, `#gui`
     * If you didn't put a GUI element in the div, an element will be automatically created.
     * 
     * @prop {string} [selectorGui]
     * @memberof RpgClient
     * */
    selectorGui?: string

    /** 
     * The selector that corresponds to the element contains canvas. By default, `#canvas`
     * If you didn't put element in the main div, an element will be automatically created.
     * 
     * @prop {string} [selectorCanvas]
     * @memberof RpgClient
     * */
    selectorCanvas?: string

    plugins?: Plugin[]

    /** 
     * Array containing the list of spritesheets
     * An element contains a class with the `@Spritesheet` decorator
     * 
     * ```ts
     * import { Spritesheet, Animation, Direction, RpgClient, RpgClientEngine } from '@rpgjs/client'
     * 
     * @Spritesheet({
     *      id: 'chest',
     *      image: require('./assets/chest.png'),
     *      // other options
     * })
     * class Chest  { }
     * 
     * @RpgClient({
     *      spritesheets: [
     *          Chest
     *      ]
     * })
     * class RPG extends RpgClientEngine {}
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
     * import { RpgClient, RpgClientEngine } from '@rpgjs/client'
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
     * @RpgClient({
     *      gui: [
     *          component
     *      ]
     * })
     * class RPG extends RpgClientEngine {}
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
     * import { Sound } from '@rpgjs/client'
     * 
     * @Sound({
     *      sounds: {
     *          town: require('./assets/Town_Theme.ogg')
     *      }
     * })
     * class Sounds {}
     * 
     * @RpgClient({
     *      sounds: [ Sounds ]
     * })
     * class RPG extends RpgClientEngine {}
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
     * import { RpgPlayer, RpgServer, RpgServerEngine } from '@rpgjs/server'
     * 
     * class Sprite extends RpgSprite {
     *      onInit() {
     *          console.log('sprite is initialized')
     *      }
     * }
     * 
     * @RpgClient({
     *      spriteClass: Sprite
     * })
     * class RPG extends RpgClientEngine { } 
     * ``` 
     * 
     * @prop {RpgClass<RpgSprite>} [spriteClass]
     * @memberof RpgClient
     * */
    spriteClass?: RpgClass<RpgSprite>

    /** 
     * Reference the scenes of the game. Here you can put your own class that inherits RpgSceneMap
     * 
     * ```ts
     * import { RpgPlayer, RpgServer, RpgServerEngine, RpgSceneMap } from '@rpgjs/server'
     * 
     * class SceneMap extends RpgSceneMap {
     *      onLoad() {
     *          // is loaded
     *      }
     * }
     * 
     * @RpgClient({
     *      scenes: {
     *      // If you put the RpgSceneMap scene, Thhe key is called mandatory `map`
     *          map: SceneMap
     *      }
     * })
     * class RPG extends RpgClientEngine { } 
     * ``` 
     * 
     * @prop { [sceneName: string]: Class of RpgSceneMap } [scenes]
     * @memberof RpgClient
     * */
    scenes?: {
        [sceneName: string]: any
    }

     /** 
     * Canvas Options
     * 
     * * {boolean} [options.transparent=false] - If the render view is transparent, default false
     * * {boolean} [options.autoDensity=false] - Resizes renderer view in CSS pixels to allow for
     *   resolutions other than 1
     * * {boolean} [options.antialias=false] - sets antialias
     * * {number} [options.resolution=1] - The resolution / device pixel ratio of the renderer. The
     *  resolution of the renderer retina would be 2.
     * * {boolean} [options.preserveDrawingBuffer=false] - enables drawing buffer preservation,
     *  enable this if you need to call toDataUrl on the webgl context.
     * * {boolean} [options.clearBeforeRender=true] - This sets if the renderer will clear the canvas or
     *      not before the new render pass.
     * * {number} [options.backgroundColor=0x000000] - The background color of the rendered area
     *  (shown if not transparent).
     * 
     * @prop {object} [canvas]
     * @memberof RpgClient
     * */
    canvas?: {
        transparent?: boolean,
        autoDensity?: boolean,
        antialias?: boolean,
        resolution?: number
        preserveDrawingBuffer?: boolean
        backgroundColor?: number
    }
}

export function RpgClient(options: RpgClientOptions) {
    return (target) => {
        target.prototype._options = {}
        for (let key in options) {
            target.prototype._options[key] = options[key]
        }
    }
}