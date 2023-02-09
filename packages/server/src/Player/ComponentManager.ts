import { Utils } from '@rpgjs/common'
import { ComponentObject, LayoutObject } from '@rpgjs/types'

export class ComponentManager {
    layout: LayoutObject<any>

    /**
     * Give the spritesheet identifier
     * 
     * Since version 3.0.0-rc, you can define several graphic elements. If you put a number, it represents the tile ID in the tileset
     * 
     * Example 1:
     * ```ts
     * player.setGraphic(['body', 'shield'])
     * ```
     * 
     * Example 2:
     * ```ts
     * player.setGraphic(3) // Use tile #3
     * ```
     * 
     * > You must, on the client side, create the spritesheet in question. Guide: [Create Sprite](/guide/create-sprite.html)
     * 
     * @title Set Graphic
     * @method player.setGraphic(graphic)
     * @param {string | number | (string | number)[]} graphic
     * @returns {void}
     * @memberof Player
     */
    setGraphic(graphic: string | number | (string | number)[]) {
        const components = (Utils.isArray(graphic) ? graphic : [graphic]) as string[]
        this.layout.center = [{
            col: components.map(value => ({ id: Utils.isString(value) ? 'graphic' : 'tile', value }))
        }]
    }

    /*
        Params:

        [
            {
                col: [
                    { id: 'graphic', value: 'body' },
                    { id: 'graphic', value: 'body' }
                ]
            },
            {
                col: [
                    { id: 'graphic', value: 'shield' }
                ]
            }
        ]
    */

    setComponentsTop<T = any>(layout: ComponentObject<T>[][])
    setComponentsTop<T = any>(layout: ComponentObject<T>[])
    setComponentsTop<T = any>(layout: ComponentObject<T>[][] | ComponentObject<T>[]) {
        this.layout.top = layout.map(col => {
            if (!Utils.isArray(col)) {
                col = [col]
            }
            return { col }
        })
    }
}