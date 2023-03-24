import { Utils } from '@rpgjs/common'
import { BarComponentObject, ComponentObject, LayoutObject, LayoutOptions, TextComponentObject, LayoutPositionEnum, ShapeComponentObject, ImageComponentObject, TileComponentObject, DebugComponentObject, TextComponentStyleObject } from '@rpgjs/types'

const defaultStyle = (style: any) => ({
    borderColor: '#000000',
    borderWidth: 2,
    bgColor: '#000000',
    borderRadius: 5,
    ...style
})

const bar = (current: string, max: string, style?: BarComponentObject['value']['style'], text?: string | null): BarComponentObject => {
    return {
        id: 'bar',
        value: {
            current,
            max,
            text: text === null ? '' : text || '{$current}/{$max}',
            style
        }
    }
}

export const Components = {
    /**
     * Displays a bar
     * 
     * Example:
     * 
     * ```ts
     * import { Components } from '@rpgjs/server'
     * Components.bar('hp', 'param.maxHp', {
     *    bgColor: '#ab0606'
     * })
     * ```
     * 
     * For text, you can use the following variables:
     * - {$current} current value
     * - {$max} maximum value
     * - {$percent} percentage
     * 
     * Example:
     * 
     * ```ts
     * import { Components } from '@rpgjs/server'
     * Components.bar('hp', 'param.maxHp', {
     *   bgColor: '#ab0606'
     * }, 'HP: {$current}/{$max}')
     * ```
     * 
     * and you can also use the variables of player:
     * 
     * ```ts
     * import { Components } from '@rpgjs/server'
     * Components.bar('hp', 'param.maxHp', {
     *  bgColor: '#ab0606'
     * }, 'HP: {$current}/{$max} - {name}') // HP: 100/100 - John
     * ```
     * 
     * @title Bar Component
     * @param {string} current Parameter that corresponds to the current value
     * @param {string} max Parameter that corresponds to the maximum value
     * @param {object} [style] style
     * @param {string} [style.bgColor] background color. Hexadecimal format.
     * @param {string} [style.fillColor] fill color. Hexadecimal format.
     * @param {string} [style.borderColor] border color. Hexadecimal format.
     * @param {number} [style.borderWidth] border width
     * @param {number} [style.height] height
     * @param {number} [style.width] width
     * @param {number} [style.borderRadius] border radius
     * @param {number} [style.opacity] opacity
     * @param {string | null} [text] text above bar. if null, no text will be displayed. You can use the variables
     * @returns {BarComponentObject}
     * @memberof Components
     * @since 3.3.0
     */
    bar,

    /**
     * Displays a life bar
     * 
     * @title HP Bar Component
     * @param {object} [style] style. See bar style (Components.bar())
     * @param {string | null} [text] test above bar (Components.bar())
     * @returns {BarComponentObject}
     * @memberof Components
     * @since 3.3.0
     */
    hpBar(style?: BarComponentObject['value']['style'], text?: string | null): BarComponentObject {
        return bar('hp', 'param.maxHp', {
            ...defaultStyle({
                fillColor: '#ab0606'
            }),
            ...((style as any) || {})
        }, text)
    },

     /**
     * Displays a SP bar
     * 
     * @title SP Bar Component
     * @param {object} [style] style. See bar style (Components.bar())
     * @param {string | null} [text] test above bar (Components.bar())
     * @returns {BarComponentObject}
     * @memberof Components
     * @since 3.3.0
     */
    spBar(style?: BarComponentObject['value']['style'], text?: string | null): BarComponentObject {
        return bar('sp', 'param.maxSp', {
            ...defaultStyle({
                fillColor: '#0fa38c'
            }),
            ...((style as any) || {}),
        }, text)
    },

     /**
     * Put on the text. You can read the content of a variable with {} format (see example below)
     * 
     * Example:
     * 
     * ```ts
     * import { Components } from '@rpgjs/server'
     * Components.text('Hello World')
     * ```
     * 
     * Example with variable:
     * 
     * ```ts
     * import { Components } from '@rpgjs/server'
     * Components.text('{name}')
     * ```
     * 
     * Other example with position:
     * 
     * ```ts
     * import { Components } from '@rpgjs/server'
     * Components.text('X: {position.x} Y: {position.y}')
     * ```
     * 
     * With style:
     * 
     * ```ts
     * import { Components } from '@rpgjs/server'
     * Components.text('Hello World', {
     *      fill: '#ffffff',
     *      fontSize: 20,
     *      fontFamily: 'Arial',
     *      stroke: '#000000',
     *      fontStyle: 'italic',
     *      fontWeight: 'bold'
     * })
     * ```
     * 
     * @title Text Component
     * @param {string} value source
     * @param {object} [style] style
     * @param {string} [style.fill] color. Hexadecimal format.
     * @param {number} [style.fontSize] font size
     * @param {string} [style.fontFamily] font family
     * @param {string} [style.stroke] stroke color. Hexadecimal format.
     * @param {'normal' | 'italic' | 'oblique'} [style.fontStyle] font style
     * @param {'normal' | 'bold' | 'bolder' | 'lighter' | '100' | '200' | '300' | '400' | '500' | '600' | '700' | '800' | '900'} [style.fontWeight] font weight
     * @param {number} [style.opacity] opacity. Between 0 and 1
     * @param {boolean} [style.wordWrap] word wrap
     * @param {'left' | 'center' | 'right' | 'justify'} [style.align] align
     * @returns {TextComponentObject}
     * @memberof Components
     * @since 3.3.0
     */
    text(value: string, style?: TextComponentStyleObject): TextComponentObject {
        return {
            id: 'text',
            value: {
                text: value,
                style: {
                    fill: '#ffffff',
                    fontSize: 15,
                    ...((style as any) || {})
                }
            }
        }
    },

    /**
     * Add a shape
     * 
     * Example:
     * 
     * ```ts
     * import { Components } from '@rpgjs/server'
     * Components.shape({
     *      fill: '#ffffff',
     *      type: 'circle',
     *      radius: 10
     * })
     * ```
     * 
     * You can use parameters:
     * 
     * ```ts
     * import { Components } from '@rpgjs/server'
     * Components.shape({
     *      fill: '#ffffff',
     *      type: 'circle',
     *      radius: 'hp'
     * })
     * ```
     * 
     * Here, the radius will be the same as the hp value
     * 
     * @title Shape Component
     * @param {object} value 
     * @param {string} value.fill color. Hexadecimal format.
     * @param {number | string} [value.opacity] opacity. Between 0 and 1
     * @param {string} value.type type of shape. Can be 'circle' or 'rectangle', 'ellipse' or 'polygon', 'line' or 'rounded-rectangle'
     * @param {number | string} [value.radius] if type is circle, radius of the circle
     * @param {number | string} [value.width] if type is rectangle or ellipse, width of the rectangle
     * @param {number | string} [value.height] if type is rectangle or ellipse, height of the rectangle
     * @param {number | string} [value.x1] if type is line, x1 position of the line
     * @param {number | string} [value.y1] if type is line, y1 position of the line
     * @param {number | string} [value.x2] if type is line, x2 position of the line
     * @param {number | string} [value.y2] if type is line, y2 position of the line
     * @param {number[]} [value.points] if type is polygon, points of the polygon
     * @param {object} [value.line] border style
     * @param {string} [value.line.color] border color. Hexadecimal format.
     * @param {number} [value.line.width] border width
     * @param {number} [value.line.alpha] border opacity. Between 0 and 1
     * @returns {ShapeComponentObject}
     * @memberof Components
     * @since 3.3.0
     */
    shape(value: ShapeComponentObject['value']): ShapeComponentObject {
        return {
            id: 'shape',
            value
        }
    },

    /**
     * Put the link to an image or the identifier of an image (if the spritesheet exists)
     * 
     * Example:
     * 
     * ```ts
     * import { Components } from '@rpgjs/server'
     * Components.image('mygraphic.png')
     * ```
     * 
     * @title Image Component
     * @param {string} value source
     * @returns {ImageComponentObject}
     * @memberof Components
     * @since 3.3.0
     */
    image(value: string): ImageComponentObject {
        return {
            id: 'image',
            value
        }
    },

    /**
     * Indicates the tile ID
     * 
     * Example:
     * 
     * ```ts
     * import { Components } from '@rpgjs/server'
     * Components.tile(3)
     * ```
     * 
     * @title Tile Component
     * @param {number} value tile ID
     * @returns {TileComponentObject}
     * @memberof Components
     * @since 3.3.0
     */
    tile(value: number): TileComponentObject {
        return {
            id: 'tile',
            value
        }
    },
    debug(): DebugComponentObject {
        return {
            id: 'debug',
            value: ''
        }
    }
}

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
     * @memberof ComponentManager
     */
    setGraphic(graphic: string | number | (string | number)[]) {
        const components = (Utils.isArray(graphic) ? graphic : [graphic]) as string[]
        const col = [...components.map(value => ({ id: Utils.isString(value) ? 'graphic' : 'tile', value }))]
        this.removeComponentById('center', 'graphic')
        this.mergeComponent('center', col)
    }

    /**
     * Delete components
     * 
     * @title Remove Components
     * @param {string} position Position of the components. Can be: `top`, `center`, `bottom`, `left`, `right`
     * @memberof ComponentManager
     * @since 3.3.0
     */
    removeComponents(position: LayoutPositionEnum) {
        (this.layout[position] as any).lines = []
    }

    /**
     * Delete components by id. 
     * 
     * @title Remove Component By Id
     * @param {string} position Position of the components. Can be: `top`, `center`, `bottom`, `left`, `right`
     * @param {string} id Id of the component
     * @since 3.3.0
     */
    removeComponentById(
        position: LayoutPositionEnum,
        id: string
    ) {
        let lines = this.layout[position]?.lines || []
        lines = lines.map(line => {
            line.col = line.col.filter(c => c.id !== id)
            return line
        });
        lines = lines.filter(line => line.col.length > 0);
        (this.layout[position] as any).lines = lines
    }

    /**
     * Merges components with existing components
     * 
     * For use layout and options, see [setComponentsTop](/api/player.html#setcomponentstop)
     * 
     * @title Merge Components
     * @param {string} position Position of the components. Can be: `top`, `center`, `bottom`, `left`, `right`
     * @param {Object} layout 
     * @param {Object} options 
     * @memberof ComponentManager
     * @since 3.3.0
     */
    mergeComponent<T = any>(
        position: LayoutPositionEnum,
        layout: ComponentObject<T>[][] | ComponentObject<T>[] | ComponentObject<T>,
        options: LayoutOptions = {}
    ) {
        if (!(layout instanceof Array)) {
            layout = [layout]
        }

        this.layout[position] = {
            lines: [
                ...(this.layout[position]?.lines || []),
                ...layout.map(col => {
                    if (!Utils.isArray(col)) {
                        col = [col]
                    }
                    return { col }
                })
            ],
            ...options
        }
    }

    private setComponents<P extends LayoutPositionEnum, T = any>(
        position: P,
        layout: ComponentObject<T>[][] | ComponentObject<T>[] | ComponentObject<T>,
        options: LayoutOptions = {}
    ) {
        (this.layout[position] as any).lines = []
        this.mergeComponent(position, layout, options)
    }

    /**
     * Add components to the center of the graphic.
     * 
     * View [setComponentsTop](/api/player.html#setcomponentstop) for more information
     * 
     * > Be careful, because if you assign, it deletes the graphics and if the lines are superimposed (unlike the other locations)
     * 
     * @title Set Components Center
     * @method player.setComponentsCenter(layout,options)
     * @param {Object} layout 
     * @param {Object} options 
     * @memberof ComponentManager
     * @since 3.3.0
     */
    setComponentsCenter<T = any>(layout: ComponentObject<T>[][] | ComponentObject<T>[] | ComponentObject<T>, options: LayoutOptions = {}) {
        this.setComponents<'center', T>('center', layout, options)
    }

    /**
     * Add components to the top of the graphic. e.g. text, life bar etc. The block will be centred
     * The first array corresponds to the rows, and the nested table to the array in the row
     * 
     * Example:
     * 
     * ```ts
     * import { Components } from '@rpgjs/server'
     * 
     * player.setComponentsTop([
     *      [Components.text('Hello World')],
     *      [Components.hpBar()]
     * ]) // 2 lines with 1 component each
     * ```
     * 
     *  or
     * 
     * ```ts
     * import { Components } from '@rpgjs/server'
     * 
     * player.setComponentsTop([
     *      [Components.text('Hello World'), Components.hpBar()]
     * ]) // 1 line with 2 components
     * ```
     * 
     * You can be faster if you only have lines
     * 
     * ```ts
     * player.setComponentsTop([
     *      Components.text('Hello World'),
     *      Components.hpBar()
     * ]) // 2 lines with 1 component each
     * ```
     * 
     * or one component:
     * 
     * ```ts
     * player.setComponentsTop(Components.text('Hello World')) // 1 line with 1 component
     * ```
     * 
     * You can add options to manage the style
     * 
     * ```ts
     * player.setComponentsTop([
     *      Components.text('Hello World'),
     *      Components.hpBar()
     * ], {
     *      width: 100,
     *      height: 20,
     *      marginTop: 10,
     * })
     * ```
     * 
     * @title Set Components Top
     * @method player.setComponentsTop(layout,options)
     * @param {ComponentObject[][] | ComponentObject[] | ComponentObject} layout Components
     * @param {Object} [options = {}] Options
     * @param {number} [options.width] Width of the block
     * @param {number} [options.height = 20] Height of the block
     * @param {number} [options.marginTop] Margin top
     * @param {number} [options.marginBottom] Margin bottom
     * @param {number} [options.marginLeft] Margin left
     * @param {number} [options.marginRight] Margin right
     * @memberof ComponentManager
     * @since 3.3.0
     */
    setComponentsTop<T = any>(layout: ComponentObject<T>[][] | ComponentObject<T>[] | ComponentObject<T>, options: LayoutOptions = {}) {
        this.setComponents<'top', T>('top', layout, options)
    }

    /**
     * Add components to the bottom of the graphic.
     * 
     * View [setComponentsTop](/api/player.html#setcomponentstop) for more information
     * 
     * @title Set Components Bottom
     * @method player.setComponentsBottom(layout,options)
     * @param {Object} layout 
     * @param {Object} options 
     * @memberof ComponentManager
     * @since 3.3.0
     */
    setComponentsBottom<T = any>(layout: ComponentObject<T>[][] | ComponentObject<T>[] | ComponentObject<T>, options: LayoutOptions = {}) {
        this.setComponents<'bottom', T>('bottom', layout, options)
    }

    /**
     * Add components to the left of the graphic.
     * 
     * View [setComponentsTop](/api/player.html#setcomponentstop) for more information
     * 
     * @title Set Components Left
     * @method player.setComponentsLeft(layout,options)
     * @param {Object} layout 
     * @param {Object} options 
     * @memberof ComponentManager
     * @since 3.3.0
     */
    setComponentsLeft<T = any>(layout: ComponentObject<T>[][] | ComponentObject<T>[] | ComponentObject<T>, options: LayoutOptions = {}) {
        this.setComponents<'left', T>('left', layout, options)
    }

    /**
     * Add components to the right of the graphic.
     * 
     * View [setComponentsTop](/api/player.html#setcomponentstop) for more information
     * 
     * @title Set Components Right
     * @method player.setComponentsRight(layout,options)
     * @param {Object} layout 
     * @param {Object} options 
     * @memberof ComponentManager
     * @since 3.3.0
     */
    setComponentsRight<T = any>(layout: ComponentObject<T>[][] | ComponentObject<T>[] | ComponentObject<T>, options: LayoutOptions = {}) {
        this.setComponents<'right', T>('right', layout, options)
    }
}