import { RpgPlayer } from './Sprite/Player'
import { RpgEvent } from './Sprite/Event'

interface RpgClass<T> {
    new (data: any, scene: any): T,
}

interface RpgClientOptions {
    selector?: string,
    selectorGui?: string,
    spritesheets?: any[],
    gui?: any[],
    /**
     * Represents the sprite for the different players on it.
     */
    playerClass?: RpgClass<RpgPlayer>
    eventClass?: RpgClass<RpgEvent>,
    /**
     * @param {object} [options] - The optional renderer parameters
     * @param {number} [options.width=800] - the width of the screen
     * @param {number} [options.height=600] - the height of the screen
     * @param {HTMLCanvasElement} [options.view] - the canvas to use as a view, optional
     * @param {boolean} [options.transparent=false] - If the render view is transparent, default false
     * @param {boolean} [options.autoDensity=false] - Resizes renderer view in CSS pixels to allow for
     *   resolutions other than 1
     * @param {boolean} [options.antialias=false] - sets antialias
     * @param {number} [options.resolution=1] - The resolution / device pixel ratio of the renderer. The
     *  resolution of the renderer retina would be 2.
     * @param {boolean} [options.preserveDrawingBuffer=false] - enables drawing buffer preservation,
     *  enable this if you need to call toDataUrl on the webgl context.
     * @param {boolean} [options.clearBeforeRender=true] - This sets if the renderer will clear the canvas or
     *      not before the new render pass.
     * @param {number} [options.backgroundColor=0x000000] - The background color of the rendered area
     *  (shown if not transparent).
     */
    canvas?: {
        width?: number,
        height?: number,
        view?: HTMLCanvasElement,
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