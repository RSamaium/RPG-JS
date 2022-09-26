import { RpgCommonMap, RpgPlugin, HookClient, RpgShape, Utils, RpgCommonPlayer } from '@rpgjs/common'
import TileMap from '../Tilemap'
import { Viewport } from 'pixi-viewport'
import { Scene, SceneObservableData, SceneSpriteLogic } from './Scene'
import { spritesheets } from '../Sprite/Spritesheets'
import { RpgSound } from '../Sound/RpgSound'
import { GameEngineClient } from '../GameEngine'
import { TiledMap } from '@rpgjs/tiled'
import { RpgComponent } from '../Components/Component'

interface MapObject extends TiledMap {
    id: number
    sounds: string | string[] | undefined
}

export class SceneMap extends Scene {
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

    shapes = {}

    constructor(
            public game: GameEngineClient, 
            private options: { screenWidth?: number, screenHeight?: number, drawMap?: boolean } = {}) {
        super(game)
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
    load(obj: MapObject, prevObj: MapObject): Promise<Viewport> {
        let { sounds } = obj
        const { clientEngine } = this.game

        if (sounds) {
            if (!Utils.isArray(sounds)) sounds  = obj.sounds = <string[]>[sounds]
        }
        
        this.gameMap = new RpgCommonMap()
        this.gameMap.load(obj)
        this.constructMethods()

        RpgCommonMap.bufferClient.set(obj.id, this.gameMap)

        this.tilemap = new TileMap(this.gameMap.getData(), this.game.renderer)

        const loader = new PIXI.Loader()
        let nbLoad = 0

        const objects = this.game.world.getObjectsOfGroup()

        for (let { object } of Object.values(objects) as any[]) {
            if (Utils.isInstanceOf(object, RpgCommonPlayer) && object) {
                (object as RpgCommonPlayer).updateInVirtualGrid()
             }
        }

        loader.reset()

        for (let tileset of this.tilemap.tilesets) {
            let spritesheet = spritesheets.get(tileset.name)
            if (!spritesheet) {
                clientEngine.addSpriteSheet(tileset.image.source, tileset.name)
                spritesheet = spritesheets.get(tileset.name)
            }
            if (spritesheet?.resource) {
                continue
            }
            loader.add(tileset.name, spritesheet.image)
            nbLoad++
        }

        if (nbLoad > 0) {
            loader.load((loader, resources) => {
                for (let tileset of this.tilemap.tilesets) {
                    const spritesheet = spritesheets.get(tileset.name)
                    if (resources[tileset.name]) spritesheet.resource = resources[tileset.name]  
                }
            })
        }

        RpgPlugin.emit(HookClient.SceneMapLoading, loader)

        return new Promise((resolve, reject) => {
            const complete = () => {
                let { sounds } = obj
                this.tilemap.load({
                    drawTiles: this.options.drawMap
                })
                this.viewport = new Viewport({
                    screenWidth: this.options.screenWidth,
                    screenHeight: this.options.screenHeight,
                    worldWidth: obj.width * obj.tilewidth,
                    worldHeight: obj.height * obj.tileheight,
                    noTicker: true
                })
                this.tilemap.addChild(this.animationLayer)
                this.viewport.clamp({ direction: 'all' })
                this.viewport.addChild(this.tilemap)
                this.isLoaded = true
                if (prevObj.sounds && prevObj.sounds instanceof Array) {
                    prevObj.sounds.forEach(soundId => {
                        const continueSound = (<string[]>obj.sounds || []).find(id => id == soundId)
                        if (!continueSound) RpgSound.stop(soundId) 
                    })
                }
                if (sounds) (<string[]>sounds).forEach(soundId => RpgSound.play(soundId))
                resolve(this.viewport)
                if (this.onLoad) this.onLoad()
            }
            loader.onError.once(() => {
                reject()
            })
            loader.onComplete.once(complete)
            if (nbLoad == 0) {
                complete()
            }
        })
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

    onUpdateObject(logic: SceneSpriteLogic, sprite: RpgComponent, moving: boolean): RpgComponent {
        const { paramsChanged } = logic
        if (!this.gameMap) return sprite
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

    /** @internal */
    setPlayerPosition(id: string, { x, y }: { x: number, y: number }) {
        this.players[id].x = x
        this.players[id].y = y
    }

    /** @internal */
    updateScene(obj: SceneObservableData) {}

    addObject(obj: RpgCommonPlayer | RpgShape, id: string): RpgComponent { 
        const wrapper = new PIXI.Container()
        const inner = new PIXI.Container()
        const tilesOverlay = new PIXI.Container()
        const component = new RpgComponent(obj, this)
 
        component.tilesOverlay = tilesOverlay
        inner.addChild(component)
        wrapper.addChild(inner, tilesOverlay)

        this.objects.set(id, component)
        this.tilemap.getEventLayer(obj.id)?.addChild(wrapper)
        if (component.isCurrentPlayer) this.viewport?.follow(component)
        component.onInit()  
        return component
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

    getShape(name: string): RpgShape | undefined {
        return this.game.getShape(name)?.object
    }

    getShapes(): RpgShape[] {
        const shapes = Object.values(this.game.getShapes())
        return shapes.map(shape => shape.object)
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