import { Context } from "@signe/di"
import { VueGui, VueGuiToken } from "./VueGui"

interface VueGuiProviderOptions {
    /** The HTML element where Vue components will be mounted */
    mountElement?: HTMLElement | string
    /** Custom CSS selector for the mount element */
    selector?: string
    /** Whether to create a new div element if none is found */
    createIfNotFound?: boolean
}

/**
 * Creates a dependency injection configuration for Vue GUI overlay on the client side.
 * 
 * This function allows you to render Vue.js components as overlays on top of the RPGJS game canvas.
 * It provides a seamless integration between Vue.js reactive components and the game engine,
 * allowing for rich user interfaces while maintaining game performance.
 * 
 * The function sets up the necessary service providers for Vue GUI rendering, including:
 * - VueGuiToken: Provides the VueGui service with your custom mounting configuration
 * - Automatic component filtering: Separates Vue components from CanvasEngine components
 * - Event propagation: Ensures proper interaction between Vue components and game canvas
 * 
 * **Design Concept:**
 * The function follows the provider pattern used throughout RPGJS, creating a modular way to inject
 * Vue GUI rendering capabilities into the client engine. It separates the concern of UI framework
 * (Vue.js) from game rendering (CanvasEngine), allowing developers to use modern web UI patterns
 * while leveraging the engine's performance.
 * 
 * @param {VueGuiProviderOptions} options - Configuration options for Vue GUI mounting
 * @returns {Object} Dependency injection provider configuration
 * 
 * @example
 * ```typescript
 * import { provideVueGui } from '@rpgjs/vue'
 * import { createModule } from '@rpgjs/common'
 * 
 * // Basic usage with automatic element creation
 * export function provideVueUIModule() {
 *   return createModule("VueUI", [
 *     provideVueGui({
 *       selector: '#vue-gui-container',
 *       createIfNotFound: true
 *     })
 *   ])
 * }
 * 
 * // Advanced usage with custom mount element
 * export function provideCustomVueUI() {
 *   return createModule("CustomVueUI", [
 *     provideVueGui({
 *       mountElement: document.getElementById('my-ui-overlay'),
 *       createIfNotFound: false
 *     })
 *   ])
 * }
 * 
 * // Usage with CSS selector
 * export function provideModalVueUI() {
 *   return createModule("ModalVueUI", [
 *     provideVueGui({
 *       selector: '.modal-overlay',
 *       createIfNotFound: true
 *     })
 *   ])
 * }
 * ```
 * 
 * **Integration in your client:**
 * ```typescript
 * import { RpgClient } from '@rpgjs/client'
 * import { provideVueGui } from '@rpgjs/vue'
 * 
 * @RpgClient({
 *   providers: [
 *     provideVueGui({
 *       selector: '#vue-gui-overlay'
 *     })
 *   ],
 *   gui: [
 *     // Vue components will be automatically handled by VueGui
 *     InventoryVueComponent,
 *     // CanvasEngine components continue to work normally
 *     DialogCanvasComponent
 *   ]
 * })
 * export class MyRpgClient {}
 * ```
 * 
 * **Available injections in Vue components:**
 * - `engine`: RpgClientEngine instance for game interactions
 * - `socket`: WebSocket connection for server communication
 * - `gui`: RpgGui instance for GUI management
 * 
 * **Event propagation:**
 * Use the `v-propagate` directive in Vue components to ensure mouse/keyboard events
 * are properly forwarded to the game canvas when needed.
 * 
 * @since 5.0.0
 * @see {@link VueGuiProviderOptions} for configuration options
 * @see {@link VueGui} for the main service class
 */
export function provideVueGui(options: VueGuiProviderOptions = {}) {
    return {
        provide: VueGuiToken,
        useFactory: (context: Context) => {
            // Only create VueGui on client side
            if (context['side'] === 'server') {
                console.warn('VueGui is only available on client side')
                return null
            }
            return new VueGui(context, options)
        },
    }
}