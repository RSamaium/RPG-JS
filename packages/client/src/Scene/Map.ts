import { RpgCommonMap, RpgPlugin, HookClient, RpgShape } from '@rpgjs/common'
import TileMap from '../Tilemap'
import { Viewport } from 'pixi-viewport'
import { IScene } from '../Interfaces/Scene'
import { Scene } from './Scene'
import { spritesheets } from '../Sprite/Spritesheets'
import Character from '../Sprite/Character'
import { RpgSound } from '../Sound/RpgSound'

export class SceneMap extends Scene implements IScene {

    /** 
     * Get the tilemap
     * 
     * @prop {PIXI.Container} [tilemap]
     * @memberof RpgSceneMap
     * */
    public tilemap: TileMap

    /** 
     * The viewport of the map
     * 
     * It automatically follows the sprite representing the player but you can attach it to something else
     * 
     * > Do not change the size of the viewport
     * 
     * @prop {PIXI.Viewport} viewport
     * @memberof RpgSceneMap
     * */
    protected viewport: Viewport | undefined
    private players: object = {}
    private isLoaded: boolean = false

    private gameMap: RpgCommonMap

    shapes = {}

    constructor(
            protected game: any, 
            private options: { screenWidth?: number, screenHeight?: number } = {}) {
        super(game)
        this.onInit()
    }

    private constructMethods() {
        [
            'getTileIndex',
            'getTileByIndex',
            'getTileOriginPosition',
            'getTileByPosition',
            'getShapes',
            'getShape',
            'getLayerByName'
        ].forEach(method => this[method] = this.gameMap[method].bind(this.gameMap));
        [
            'heightPx',
            'widthPx',
            'zTileHeight',
            'tileHeight',
            'tileWidth',
            'data',
            'layers'
        ].forEach(prop => this[prop] = this.gameMap[prop])
        
    }

    load(obj): Promise<Viewport> {
        this.gameMap = new RpgCommonMap()
        this.gameMap.load(obj)
        this.constructMethods()

        if (!this.game.standalone) RpgCommonMap.buffer.set(obj.id, this.gameMap)

        this.tilemap = new TileMap(obj, this.game.renderer)

        const loader = PIXI.Loader.shared
        let nbLoad = 0

        loader.reset()

        for (let tileset of this.tilemap.tileSets) {
            if (tileset.spritesheet.resource) continue
            loader.add(tileset.name, tileset.spritesheet.image)
            nbLoad++
        }

        loader.load((loader, resources) => {
            for (let tileset of this.tilemap.tileSets) {
                const spritesheet = spritesheets.get(tileset.name)
                if (resources[tileset.name]) spritesheet.resource = resources[tileset.name]  
            }
        })

        RpgSound.global.stop()

        RpgPlugin.emit(HookClient.SceneMapLoading, loader)

        return new Promise((resolve, reject) => {
            const complete = () => {
                this.tilemap.load()
                this.viewport = new Viewport({
                    screenWidth: this.options.screenWidth,
                    screenHeight: this.options.screenHeight,
                    worldWidth: obj.width * obj.tileWidth,
                    worldHeight: obj.height * obj.tileHeight
                })
                this.tilemap.addChild(this.animationLayer)
                this.viewport.clamp({ direction: 'all' })
                this.viewport.addChild(this.tilemap)
                this.isLoaded = true
                if (obj.sounds) {
                    obj.sounds.forEach(soundId => RpgSound.get(soundId).play())
                }
                resolve(this.viewport)
                if  (this.onLoad) this.onLoad()
            }
            loader.onError.add(() => {
                reject()
            })
            loader.onComplete.add(complete)
            if (nbLoad == 0) {
                complete()
            }
        })
    }

    changeTile(x: number, y: number, layers: {
        [layerName: string]: object
    }) {
        for (let layerName in layers) {
            const layerInfo = layers[layerName]
            this.gameMap.setTile(x, y, layerName, layerInfo)
            this.tilemap.changeTile(x, y, layerName)
        }
    }

    draw(t: number, dt: number, frame: number) {
        if (!this.isLoaded) {
            return
        }
        super.draw(t, dt, frame)
        this.tilemap.drawAnimateTile(frame)
    }

    onUpdateObject(logic, sprite: Character, moving: boolean): Character {
        const { paramsChanged } = logic
        if (moving || (paramsChanged && (paramsChanged.width || paramsChanged.height))) {
            const { tileWidth, tileHeight } = this.gameMap
            const { tilesOverlay }: any = sprite
            const bounds = sprite.parent.getLocalBounds()
            const width = Math.ceil(bounds.width / tileWidth) * tileWidth
            const height = Math.ceil(bounds.height / tileHeight) * tileHeight
            const _x = bounds.x
            const _y = bounds.y

            const addTile = (x, y) => {
                const tiles = this.tilemap.createOverlayTiles(x, y, sprite)
                if (tiles.length) tilesOverlay.addChild(...tiles)
            }

            tilesOverlay.removeChildren()

            for (let i = _x ; i <= _x + width ; i += tileWidth) {
                for (let j = _y ; j <= _y + height ; j += tileHeight) {
                    addTile(i, j)
                }
            }
        }
        return sprite
    }

    setPlayerPosition(id: string, { x, y }: { x: number, y: number }) {
        this.players[id].x = x
        this.players[id].y = y
    }

    updateScene(obj: { data: any, partial: any }) {
        const shapes = obj.partial.shapes
        const fullShapesObj = obj.data.shapes

        const createShapeContainer = (instanceShape, shape) => {
            instanceShape.clientContainer = new PIXI.Container()
            if (shape.properties.color) {
                const graphics = new PIXI.Graphics()
                graphics.beginFill(shape.properties.color);
                graphics.drawRect(0, 0, shape.width, shape.height)
                graphics.endFill()
                instanceShape.clientContainer.addChild(graphics)
            }
            instanceShape.clientContainer.x = shape.x
            instanceShape.clientContainer.y = shape.y
            this.tilemap.shapeLayer.addChild(instanceShape.clientContainer)
            this.shapes[shape.name] = instanceShape.clientContainer
        }

        if (shapes) {
            for (let i in shapes) {
                let shape = fullShapesObj[i]
                const { name } = shape
                const shapeMap = this.gameMap.getShape(name)
                if (shape == null) {
                    this.gameMap.removeShape(name)
                    continue
                }
                shape = {
                    ...shape,
                    x: shape.hitbox.pos.x,
                    y: shape.hitbox.pos.y,
                    width: shape.hitbox.w,
                    height: shape.hitbox.h,
                    properties: shape.properties
                }
                if (shapeMap) {
                    if (!shapeMap.clientContainer) {
                        createShapeContainer(shapeMap, shape)
                    }
                    shapeMap.set(shape)
                }
                if (!this.shapes[name]) {
                    const instanceShape  = this.gameMap.createShape(shape)
                    createShapeContainer(instanceShape, shape)
                }     
            }
        }
    }

    addObject(obj, id: string): Character {
        const wrapper = new PIXI.Container()
        const inner = new PIXI.Container()
        const tilesOverlay = new PIXI.Container()
        const sprite = new this.game._playerClass(obj, this)
        
        sprite.tilesOverlay = tilesOverlay
        inner.addChild(sprite)
        wrapper.addChild(inner, tilesOverlay)

        this.objects.set(id, sprite)
        this.tilemap.getEventLayer().addChild(wrapper)

        if (sprite.isCurrentPlayer) this.viewport?.follow(sprite)
        sprite.onInit()

        RpgPlugin.emit(HookClient.SceneAddSprite, [this, sprite], true)
        RpgPlugin.emit(HookClient.AddSprite, sprite)
        return sprite
    }

    removeObject(id: string) {
        let sprite =  this.objects.get(id)
        if (sprite) {
            this.objects.delete(id)
            RpgPlugin.emit(HookClient.SceneRemoveSprite, [this, sprite], true)
            RpgPlugin.emit(HookClient.RemoveSprite, sprite)
            sprite.destroy()
        }
    }

    /**
     * Listen to the events of the smile on the stage
     *
     * @title Listen mouse event
     * @method on(eventName,callback)
     * @since 3.0.0-beta.4
     * @param {string} eventName  Name of the event (see PIXI documentation). Name often used in the codes
     * - click
     * - mousedown
     * - mouseup
     * - mousemove
     * - pointerdown
     * - pointermove
     * - pointerup
     * - (etc...)
     * @param {(position: { x: number, y: number }, ev?: PIXI.InteractionEvent ) => any} callback
     * @example
     * ```ts
     * sceneMap.on('pointerdown', (position) => {
     *      console.log(position)
     * })
     * ```
     * @returns {void}
     * @memberof RpgSceneMap
     */
    on(eventName: string, cb: (position: { x: number, y: number }, ev?: PIXI.InteractionEvent ) => any) {
        if (!this.tilemap) return
        this.tilemap.background.interactive = true
        this.tilemap.background.on(eventName, function(ev) {
            const pos = ev.data.getLocalPosition(this.parent)
            cb(pos, ev)
        })
    }
}

export interface SceneMap {
     data: any;
     tileWidth: number;
     tileHeight: number;
     layers: any[];
     widthPx: number;
     heightPx: number;
     zTileHeight: number
     getShapes(): RpgShape[];
     getShape(name: string): RpgShape | undefined;
     getPositionByShape(filter: (shape: RpgShape) => {}): {
         x: number;
         y: number;
         z: number;
     } | null;
     getTileIndex(x: number, y: number, [z]?: [number]): number;  
     getTileByIndex(tileIndex: number, zPlayer?: [number, number]): any;
     getTileOriginPosition(x: number, y: number): {
         x: number;
         y: number;
     };
     getTileByPosition(x: number, y: number, z?: [number, number]): any;
     getLayerByName(name: string): any
}