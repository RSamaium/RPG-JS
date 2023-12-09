import { RpgCommonMap, RpgPlugin, HookClient, RpgShape, Utils, RpgCommonPlayer, InjectContext } from '@rpgjs/common'
import TileMap from '../Tilemap'
import * as _PixiViewport from 'pixi-viewport'
import { type Viewport } from 'pixi-viewport'
import { Scene, SceneObservableData, SceneSpriteLogic } from './Scene'
import { spritesheets } from '../Sprite/Spritesheets'
import { RpgSound } from '../Sound/RpgSound'
import { TiledLayerType, TiledMap } from '@rpgjs/tiled'
import { RpgComponent } from '../Components/Component'
import { type CameraOptions } from '@rpgjs/types'
import { Assets, Container, Point, IRenderer, DisplayObjectEvents, utils, FederatedPointerEvent } from 'pixi.js'
import { EventLayer } from './EventLayer'

interface MapObject extends TiledMap {
    id: number
    sounds: string | string[] | undefined
}

// The export was made in this way to ensure compatibility with unit tests (https://github.com/RSamaium/RPG-JS/issues/240)
const { Viewport: PixiViewport } = _PixiViewport;

export class SceneMap extends Scene {
    static readonly EVENTS_LAYER_DEFAULT: string = 'events-layer-default'

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
    public viewport: Viewport | undefined
    private players: object = {}
    private isLoaded: boolean = false
    private gameMap: RpgCommonMap | undefined
    private eventsLayers: {
        [eventLayerName: string]: Container
    } = {}
    private defaultLayer: Container | undefined

    shapes = {}

    constructor(
        protected context: InjectContext,
        private renderer: IRenderer,
        private options: { screenWidth?: number, screenHeight?: number, drawMap?: boolean } = {}
    ) {
        super(context)
        if (options.drawMap === undefined) this.options.drawMap = true
        this.onInit()
    }

    private constructMethods() {
        [
            'getTileIndex',
            'getTileByIndex',
            'getTileOriginPosition',
            'getTileByPosition',
            'getLayerByName'
        ].forEach(method => this[method] = (this.gameMap as any)[method].bind(this.gameMap));
        [
            'heightPx',
            'widthPx',
            'zTileHeight',
            'tileHeight',
            'tileWidth',
            'data',
            'layers'
        ].forEach(prop => this[prop] = (this.gameMap as any)[prop])

    }

    /** @internal */
    async load(obj: MapObject, prevObj: MapObject, isUpdate = false): Promise<Viewport> {
        let { sounds } = obj
        const { clientEngine } = this.game

        if (sounds) {
            if (!Utils.isArray(sounds)) sounds = obj.sounds = <string[]>[sounds]
        }

        this.gameMap = new RpgCommonMap()
        this.gameMap.load(obj)
        this.gameMap.clearCacheTilesets()
        this.constructMethods()

        RpgCommonMap.bufferClient.set(obj.id, this.gameMap)

        this.tilemap = new TileMap(this.context, this.gameMap.getData())

        // TODO: Remove this
        Assets.reset()

        let nbLoad = 0

        const objects = this.game.world.getObjectsOfGroup()

        for (let { object } of Object.values(objects) as any[]) {
            if (Utils.isInstanceOf(object, RpgCommonPlayer) && object) {
                (object as RpgCommonPlayer).updateInVirtualGrid()
            }
        }

        const assets: string[] = []
        for (let tileset of this.tilemap.tilesets) {
            let spritesheet = spritesheets.get(tileset.name)
            if (!spritesheet) {
                clientEngine.addSpriteSheet(tileset.image.source, tileset.name)
                spritesheet = spritesheets.get(tileset.name)
            }
            if (spritesheet?.resource) {
                continue
            }
            Assets.add(tileset.name, spritesheet.image)
            assets.push(tileset.name)
            nbLoad++
        }

        if (nbLoad > 0) {
            const assetsLoaded = await Assets.load(assets)
            for (let assetName in assetsLoaded) {
                const spritesheet = spritesheets.get(assetName)
                if (spritesheet) spritesheet.resource = assetsLoaded[assetName]
            }
        }

        RpgPlugin.emit(HookClient.SceneMapLoading, Assets)

        this.tilemap.load({
            drawTiles: this.options.drawMap,
            isUpdate
        })
        this.viewport = new PixiViewport({
            screenWidth: this.options.screenWidth,
            screenHeight: this.options.screenHeight,
            worldWidth: obj.width * obj.tilewidth,
            worldHeight: obj.height * obj.tileheight,
            noTicker: true,
            events: this.renderer.events
        })
        this.tilemap.addChild(this.animationLayer)
        this.viewport.clamp({ direction: 'all' })
        this.viewport.addChild(this.tilemap, ...this.createEventLayers(obj))
        this.isLoaded = true
        if (prevObj.sounds && prevObj.sounds instanceof Array) {
            prevObj.sounds.forEach(soundId => {
                const continueSound = (<string[]>obj.sounds || []).find(id => id == soundId)
                if (!continueSound) RpgSound.stop(soundId)
            })
        }
        if (sounds) (<string[]>sounds).forEach(soundId => RpgSound.play(soundId))
        if (this.onLoad) this.onLoad()

        return this.viewport
    }

    createEventLayers(map: MapObject): Container[] {
        const containers: Container[] = []
        map.layers.forEach((layerData) => {
            if (layerData.type !== TiledLayerType.ObjectGroup) return
            if (this.eventsLayers[layerData.name]) {
                containers.push(this.eventsLayers[layerData.name])
                return
            }
            const layer = new EventLayer()
            this.defaultLayer = this.eventsLayers[layerData.name] = layer
            containers.push(layer)
        })
        if (containers.length == 0) {
            if (!this.defaultLayer) {
                this.defaultLayer = new EventLayer()
            }
            containers.push(this.defaultLayer)
        }
        this.cameraFollowSprite(this.game.playerId)
        return containers
    }

    getEventLayer(objectName?: string): Container | undefined {
        for (let layerData of this.data.layers) {
            if (layerData.type != TiledLayerType.ObjectGroup) {
                continue
            }
            if (!layerData.objects) {
                continue
            }
            for (let object of layerData.objects) {
                if (object.name == objectName) {
                    return this.eventsLayers[layerData.name]
                }
            }
        }
        return this.defaultLayer
    }

    /** @internal */
    changeTile(x: number, y: number, layers: {
        [layerName: string]: object
    }) {
        for (let layerName in layers) {
            const layerInfo = layers[layerName]
            this.gameMap?.setTile(x, y, layerName, layerInfo)
            this.tilemap.changeTile(x, y, layerName)
        }
    }

    /** @internal */
    draw(t: number, deltaTime: number, deltaRatio: number, frame: number) {
        if (!this.isLoaded) {
            return
        }
        super.draw(t, deltaTime, deltaRatio, frame)
        this.tilemap.drawAnimateTile(frame)
        this.viewport?.update(deltaTime)
    }

    // @internal
    updateTilesOverlayAllSprites() {
        const objects = this.objects
        for (let [id, sprite] of objects) {
            this.updateTilesOverlay(sprite)
        }
    }

    private updateTilesOverlay(sprite: RpgComponent) {
        if (!this.gameMap) return sprite
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

        for (let i = _x; i <= _x + width; i += tileWidth) {
            for (let j = _y; j <= _y + height; j += tileHeight) {
                addTile(i, j)
            }
        }
        return sprite
    }

    onUpdateObject(logic: SceneSpriteLogic, sprite: RpgComponent, moving: boolean): RpgComponent {
        const { paramsChanged } = logic
        if (!this.gameMap) return sprite
        if (moving || (paramsChanged && (paramsChanged.width || paramsChanged.height))) {
            this.updateTilesOverlay(sprite)
        }
        return sprite
    }

    /** @internal */
    setPlayerPosition(id: string, { x, y }: { x: number, y: number }) {
        this.players[id].x = x
        this.players[id].y = y
    }

    /** @internal */
    updateScene(obj: SceneObservableData) { }

    addObject(obj: RpgCommonPlayer | RpgShape, id: string): RpgComponent {
        const wrapper = new Container()
        const inner = new Container()
        const tilesOverlay = new Container()
        const component = new RpgComponent(obj, this)

        component.tilesOverlay = tilesOverlay
        inner.addChild(component)
        wrapper.addChild(inner, tilesOverlay)

        this.objects.set(id, component)
        this.getEventLayer(obj.id)?.addChild(wrapper)
        if (component.isCurrentPlayer) this.cameraFollowSprite(id)
        component.onInit()
        return component
    }

    removeObject(id: string) {
        let sprite = this.objects.get(id)
        if (sprite) {
            if (!sprite.animationIsPlaying) {
                this.objects.delete(id)
                RpgPlugin.emit(HookClient.SceneRemoveSprite, [this, sprite], true)
                RpgPlugin.emit(HookClient.RemoveSprite, sprite)
                sprite.destroy()
            }
            else {
                sprite.visible = false
            }
        }
    }

    getShape(name: string): RpgShape | undefined {
        return this.game.getShape(name)?.object
    }

    getShapes(): RpgShape[] {
        const shapes = Object.values(this.game.getShapes())
        return shapes.map(shape => shape.object)
    }

    cameraFollowSprite(id: string, options: CameraOptions = {}) {
        const sprite = this.getSprite(id)
        const follow = () => {
            if (sprite) this.viewport?.follow(sprite)
        }
        if (options.smoothMove) {
            this.viewport?.plugins.remove('follow')
            let moreOptions = {}
            if (typeof options.smoothMove != 'boolean') {
                moreOptions = options.smoothMove
            }
            this.viewport?.animate({
                position: new Point(sprite?.x, sprite?.y),
                ...moreOptions,
                callbackOnComplete: follow
            })
        }
        else {
            follow()
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
    on(eventName: keyof DisplayObjectEvents, cb: (position: { x: number, y: number }, ev?: any) => any) {
        if (!this.viewport) return
        this.viewport.eventMode = 'static'
        this.viewport.on(eventName, (...args) => {
            const ev: FederatedPointerEvent = args[0] as any
            const pos = ev.getLocalPosition(this.viewport as Viewport)
            if (ev.defaultPrevented) return
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