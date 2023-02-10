import { Direction, HookClient, RpgCommonPlayer, RpgPlugin, RpgShape, Utils } from "@rpgjs/common"
import { ComponentObject, LayoutObject, LayoutOptions, PlayerType, PositionXY } from "@rpgjs/types"
import { map, filter, tap, distinctUntilKeyChanged, distinctUntilChanged } from "rxjs/operators"
import { log } from "../Logger"
import { Scene } from "../Scene/Scene"
import { RpgSprite } from "../Sprite/Player"
import { BarComponent } from "./BarComponent"
import { ColorComponent } from "./ColorComponent"
import { ImageComponent } from "./ImageComponent"
import { TextComponent } from "./TextComponent"
import { TileComponent } from "./TileComponent"

type PIXIComponent = PIXI.Container | PIXI.Graphics | PIXI.Text
type SpriteInfo = { width : number, height: number, x: number, y: number, anchor: { x: number, y: number } }

export interface IComponent {
    id: string,
    value: any
}

const layoutObject = {
    lines: []
}

export class RpgComponent<T = any> extends PIXI.Container {
    /** @internal */
    tilesOverlay: any
    /** @internal */
    h: number = 1
    /** @internal */
    w: number = 1
    protected _x: number = 0
    protected _y: number = 0
    private _rotation: number = 0
    protected teleported: number = 0
    protected map: string = ''
    protected z: number = 0
    protected fixed: boolean = false
    private components: LayoutObject<any> = {
        top: layoutObject,
        bottom: layoutObject,
        left: layoutObject,
        right: layoutObject,
        center: layoutObject
    }
    private direction: number = 0
    private container: PIXI.Container = new PIXI.Container()
    private registerComponents: Map<string, any> = new Map()
    private dragMode?: {
        data: any,
        dragging: boolean
    }

    readonly game = this.scene.game

    constructor(private data: RpgCommonPlayer | RpgShape, private scene: Scene) {
        super()
        this.setPosition(false)
        this.registerComponents.set(RpgSprite.id, RpgSprite)
        this.registerComponents.set(TextComponent.id, TextComponent)
        this.registerComponents.set(ColorComponent.id, ColorComponent)
        this.registerComponents.set(TileComponent.id, TileComponent)
        this.registerComponents.set(ImageComponent.id, ImageComponent)
        this.registerComponents.set(BarComponent.id, BarComponent)
        this.addChild(this.container)
        RpgPlugin.emit(HookClient.AddSprite, this)
        RpgPlugin.emit(HookClient.SceneAddSprite, [this.scene, this], true)
        this.game.listenObject(data.id)
            .pipe(
                map(object => object?.paramsChanged),
                tap(() => {
                    RpgPlugin.emit(HookClient.ChangesSprite, [this, this.logic?.['paramsChanged'], this.logic?.['prevParamsChanged']], true)
                }),
                filter(object => {
                    return this.logic?.['componentChanged']
                })
            )
            .subscribe((val) => {
                if (this.logic) {
                    this.updateComponents(this.logic?.['componentChanged'])
                    this.logic['componentChanged'] = undefined
                }
            })

    }

    /** 
     * the direction of the sprite
     * 
     * @prop {Direction} dir
     * @readonly
     * @memberof RpgSprite
     * */
    get dir(): Direction {
        return this.direction
    }

    /** 
    * To know if the sprite is a player
    * 
    * @prop {boolean} isPlayer
    * @readonly
    * @memberof RpgSprite
    * */
    get isPlayer(): boolean {
        return this.data.type == PlayerType.Player
    }

    /** 
     * To know if the sprite is an event
     * 
     * @prop {boolean} isEvent
     * @readonly
     * @memberof RpgSprite
     * */
    get isEvent(): boolean {
        return this.data.type == PlayerType.Event
    }

    /** 
     * To know if the sprite is a shape
     * 
     * @prop {boolean} isShape
     * @since 3.0.0-rc
     * @readonly
     * @memberof RpgSprite
     * */
    get isShape(): boolean {
        return Utils.isInstanceOf(this.data, RpgShape)
    }

    /** 
     * To know if the sprite is the sprite controlled by the player
     * 
     * @prop {boolean} isCurrentPlayer
     * @readonly
     * @memberof RpgSprite
     * */
    get isCurrentPlayer(): boolean {
        return this.data.id === this.scene.game.playerId
    }

    /** 
     * Retrieves the logic of the sprite
     * 
     * @prop {RpgSpriteLogic} logic
     * @readonly
     * @since 3.0.0-beta.4
     * @memberof RpgSprite
     * */
    get logic(): RpgCommonPlayer | RpgShape | null {
        return this.scene.game.world.getAll(this.data.id)
    }

    get guiDisplay(): boolean {
        return (this.logic as RpgCommonPlayer).guiDisplay
    }

    set guiDisplay(val: boolean) {
        (this.logic as RpgCommonPlayer).guiDisplay = val
    }

    setPosition(smooth: boolean = true) {
        if (this.isShape) {
            const { width, height, x, y } = this.data as RpgShape
            this.w = width
            this.h = height
            this._x = Math.floor(x)
            this._y = Math.floor(y)
        }
        else {
            const { position, direction } = this.data as RpgCommonPlayer
            this._x = Math.floor(position?.x ?? 0)
            this._y = Math.floor(position?.y ?? 0)
            this.z = Math.floor(position?.z ?? 0)
            this.direction = direction
        }
        this._rotation = this.data['rotation'] ?? 0
        if (!smooth) {
            this.x = this._x
            this.y = this._y
            this.angle = this._rotation
        }
    }

    drag() {
        this.interactive = true
        const filter = new PIXI.filters.ColorMatrixFilter();

        const onDragEnd = () => {
            if (!this.dragMode) return
            this.dragMode.dragging = false
            this.dragMode.data = null
        }

        this
            .on('pointerdown', (event) => {
                this.dragMode = {
                    data: event.data,
                    dragging: true
                }
            })
            .on('pointerup', onDragEnd)
            .on('pointerupoutside', onDragEnd)
            .on('pointermove', () => {
                if (!this.dragMode) return
                const { dragging, data } = this.dragMode
                if (dragging) {
                    const newPosition = data.getLocalPosition(this.parent)
                    this.x = newPosition.x
                    this.y = newPosition.y
                }
            })
    }

    update(obj: any, objChanged: any, time: number, deltaRatio: number): { moving: boolean } {
        if (this.dragMode?.dragging) return { moving: true }

        const { speed, teleported, map, fixed, rotation } = obj
        this.data = obj
        this.setPosition()
        const renderSpeed = speed * deltaRatio
        if (this._rotation != this.angle) {
            this.angle += Math.min(renderSpeed, this._rotation - this.angle)
        }

        let moving = false

        if (!fixed) {
            if (teleported != this.teleported || map != this.map) {
                this.x = this._x
                this.y = this._y
                this.teleported = teleported
                this.map = map
            }

            this.parent.parent.zIndex = this._y

            obj.posX = this._x
            obj.posY = this._y

            if (this._x > this.x) {
                this.x += Math.min(renderSpeed, this._x - this.x)
                moving = true
            }

            if (this._x < this.x) {
                this.x -= Math.min(renderSpeed, this.x - this._x)
                moving = true
            }

            if (this._y > this.y) {
                this.y += Math.min(renderSpeed, this._y - this.y)
                moving = true
            }

            if (this._y < this.y) {
                this.y -= Math.min(renderSpeed, this.y - this._y)
                moving = true
            }
        }

        this.callMethodInComponents('update', [obj, { moving }, deltaRatio])
        this.onUpdate(obj)

        return {
            moving
        }
    }

    showAnimation(graphic: string | string[], animationName: string) {
        return this.callMethodInComponents('showAnimation', [graphic, animationName])
    }

    /**
    * Recover the position according to the graphic
    * Normally, the position is that of the hitbox but, we retrieve the top left corner of the graphic
    * 
    * You can also pass the `middle` value as first parameter to retrieve the positions from the middle of the sprite
    * 
    * @title Get Positions of Graphic
    * @method sprite.getPositionsOfGraphic(align)
    * @param {string} [align] middle
    * @returns { x: number, y: number }
    * @memberof RpgSprite
    */
    getPositionsOfGraphic(align: string): PositionXY {
        let sprite: RpgSprite | undefined
        // if no component (no graphic for example)
        if (this.components.center.lines.length !== 0) {
            sprite = this.container.getChildAt(0) as RpgSprite
        }
        const isMiddle = align == 'middle'
        return {
            x: this.x - this.w * (sprite?.anchor.x ?? 1) + (isMiddle ? this.w / 2 : 0),
            y: this.y - this.h * (sprite?.anchor.y ?? 1) + (isMiddle ? this.h / 2 : 0)
        }
    }

    private callMethodInComponents(name: string, params: unknown[]) {
        for (let component of this.container.children) {
            if (component[name]) component[name](...params)
        }
    }

    private createGrid(gridArray, options: LayoutOptions, sprite: SpriteInfo) {
        const gridContainer = new PIXI.Container();
        const { height } = sprite
        const width = options.width ?? sprite.width
        const gridHeight = options.height ?? 32

        // replace x and y gridContainer with sprite anchor
        gridContainer.x = gridContainer.x - ((width) * sprite.anchor.x)
        gridContainer.y = gridContainer.y - (height * sprite.anchor.y) - +(options.marginBottom ?? 0)
        gridContainer.y -= (gridArray.length * gridHeight)

        for (let y = 0; y < gridArray.length; y++) {
            const columns = gridArray[y].col.length;
            const cellWidth = (width / columns);
            for (let x = 0; x < columns; x++) {
                const params: ComponentObject<any> = gridArray[y].col[x];
                const component = this.applyComponent(params) as any
                component.onRender$.subscribe(() => {
                    component.x = Math.round((x * cellWidth) + (cellWidth / 2) - (component.width / 2))
                    component.y = Math.round((y * gridHeight) + (gridHeight / 2) - (component.height / 2))
                })
                component.onInit({
                    width: cellWidth,
                    height: gridHeight
                })
                gridContainer.addChild(component)
            }
        }

        return gridContainer;
    }

    private applyComponent(component: ComponentObject<any>): PIXI.Container {
        const compClass = this.registerComponents.get(component.id)
        if (!compClass) {
            throw log(`Impossible to find ${component.id} component`)
        }
        return new compClass(this, component.value)
    }

    private createComponentCenter(components: LayoutObject<any>) {
        this.container.removeChildren()
        for (let { col } of components.center.lines) {
            for (let component of col) {
                this.container.addChild(this.applyComponent(component))
            }
        }
        this.components = components
    }

    private refreshComponents(components: LayoutObject<any>, sprite: PIXI.Sprite) {
        if (components.top?.lines) {
            this.container.addChild(
                this.createGrid(components.top.lines, components.top, sprite)
            )
        }
    }

    private updateComponents(components: LayoutObject<any>) {
        // TODO: unsubscribe
        this.createComponentCenter(components)
        this.container.children[0].animationSprite()
            .pipe(
                filter((sprite: any) => sprite),
                map((sprite: any) => ({
                    width: sprite.width,
                    height: sprite.height,
                    anchor: sprite.anchor
                })),
                distinctUntilChanged((p: any, q: any) =>
                    p.width === q.width &&
                    p.height === q.height &&
                    p.anchor.x === q.anchor.x &&
                    p.anchor.y === q.anchor.y),
            )
            .subscribe((sprite) => {
                this.refreshComponents(components, sprite)
            })
    }

    getScene<T>(): T {
        return this.scene as any
    }

    // Hooks
    onInit() { }
    onUpdate(obj) { }
    onMove() { }
    onChanges(data, old) { }
}