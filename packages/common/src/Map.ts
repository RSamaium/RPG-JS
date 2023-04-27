import { HitObject } from './Hit'
import SAT from 'sat'
import Utils, { random, intersection, generateUID, isString } from './Utils'
import { RpgShape } from './Shape'
import { Hit } from './Hit'
import { VirtualGrid } from './VirtualGrid'
import { RpgCommonWorldMaps } from './WorldMaps'
import { TiledLayer, TiledLayerType, TiledMap, Layer, Tileset, Tile, TiledObject, TiledObjectClass, MapClass } from '@rpgjs/tiled'
import { Vector2d } from './Vector2d'
import { AbstractObject } from './AbstractObject'
import { RpgCommonGame } from './Game'
import { Observable, map, Subject, takeUntil, mergeMap, from, filter } from 'rxjs'
import { HitBox, MovingHitbox, Tick } from '@rpgjs/types'

const buffer = new Map()
const bufferClient = new Map()

export interface TileInfo {
    tiles: Tile[]
    hasCollision: boolean | undefined
    isClimbable?: boolean | undefined
    isOverlay: boolean | undefined
    objectGroups: TiledObjectClass[],
    tileIndex: number
}

export interface LayerInfo {
    type: string,
    name: string,
    opacity: number,
    visible: boolean,
    properties: any,
    objects: HitObject[]
    tiles: Tile[]
}


export class RpgCommonMap extends MapClass {
    /** 
     * @title map id
     * @readonly
     * @prop {string} [id]
     * @memberof Map
     * */
     readonly id: string

    grid: VirtualGrid
    gridShapes: VirtualGrid
    gridTiles: VirtualGrid

    get tileWidth() {
        return this.tilewidth
    }

    get tileHeight() {
        return this.tileheight
    }
    
    /** 
     * @title Layers of map
     * @prop {object[]} [layers]
     * @readonly
     * @memberof Map
     * @memberof RpgSceneMap
     * */
    
    /** @internal */
    shapes: {
        [shapeName: string]: RpgShape
    } = {}

    private worldMapParent: RpgCommonWorldMaps | undefined

    /** 
     * Retrieves the X position of the map in the world (0 if no world assigned)
     * 
     * @title World X Position
     * @prop {number} [worldX]
     * @readonly
     * @since 3.0.0-beta.8
     * @memberof Map
     * */
    get worldX() {
        return this.getInWorldMaps()?.getMapInfo(this.id)?.x || 0
    }

    /** 
     * Retrieves the Y position of the map in the world (0 if no world assigned)
     * 
     * @title World Y Position
     * @prop {number} [worldY]
     * @readonly
     * @since 3.0.0-beta.8
     * @memberof Map
     * */
    get worldY() {
        return this.getInWorldMaps()?.getMapInfo(this.id)?.y || 0
    }

    /**
     * Memorize the maps so you don't have to make a new request or open a file each time you load a map
     */
    static get buffer() {
        return buffer
    }

    /**
     * In RPG mode, to avoid confusion with buffer, we have a new variable to memorize the maps
     */
    static get bufferClient() {
        return bufferClient
    }

    load(data: TiledMap) {
        super.load(data)
        this.gridTiles = new VirtualGrid(this.width, this.tileWidth, this.tileHeight)
        this.grid = new VirtualGrid(this.width, this.tileWidth, this.tileHeight).zoom(10)
        this.gridShapes = new VirtualGrid(this.width, this.tileWidth, this.tileHeight).zoom(20)
    }

    /**
     * Create a shape dynamically on the map
     * 
     * Object:
     *  - (number) x: Position X
     *  - (number) y: Position Y
     *  - (number) width: Width
     *  - (number) height: Height
     *  - (object) properties (optionnal): 
     *      - (number) z: Position Z
     *      - (hexadecimal) color: Color (shared with client)
     *      - (boolean) collision
     *      - You can your own properties
     * 
     * @title Create Shape
     * @since 3.0.0-beta.3
     * @method map.createShape(obj)
     * @param {object} obj
     * @returns {RpgShape}
     * @memberof Map
     */
    createShape(obj: HitObject): RpgShape {
        const id = obj.name = (obj.name || generateUID()) as string
        const shape = new RpgShape(obj as TiledObjectClass)
        this.shapes[id] = shape
        if (!shape.isShapePosition()) {
            this.gridShapes.insertInCells(id, shape.getSizeBox(this.tileWidth))
        }
        // trick to sync with client
        return this.shapes[id]
    }

    /**
     * Delete a shape
     * 
     * @title Delete Shape
     * @method map.removeShape(name)
     * @param {string} name Name of shape
     * @returns {void}
     * @memberof Map
     */
    removeShape(name: string) {
        // TODO: out players after delete shape
        //this.shapes = this.shapes.filter(shape => shape.name != name)
        delete this.shapes[name]
    }

    clearShapes() {
        this.shapes = {}
    }

    /**
     * Return all shapes on the map
     * 
     * @title Get Shapes
     * @method map.getShapes()
     * @returns {RpgShape[]}
     * @memberof Map
     * @memberof RpgSceneMap
     */
    getShapes(): RpgShape[] {
        return Object.values(this.shapes)
    }

    /**
     * Returns a shape by its name. Returns undefined is nothing is found
     * 
     * @title Get Shape by name
     * @method map.getShape(name)
     * @param {string} name Name of shape
     * @returns {RpgShape[] | undefined}
     * @memberof Map
     * @memberof RpgSceneMap
     */
    getShape(name: string): RpgShape | undefined {
        return this.getShapes().find(shape => shape.name == name)
    }
    
    getPositionByShape(filter: (shape: RpgShape) => {}): { x: number, y: number, z: number } | null {
        const startsFind = this.getShapes().filter(filter)
        if (startsFind.length) {
            const start = startsFind[random(0, startsFind.length-1)]
            return { x: start.hitbox.x, y: start.hitbox.y, z: start.properties.z * this.zTileHeight || 0 }
        }
        return null
    }

    /**
     * Get tile and verify collision with hitbox
     * @param hitbox 
     * @param x 
     * @param y 
     * @param z 
     * @returns TileInfo
     */
    getTile(hitbox, x: number, y: number, z: [number, number] = [0, 0]): TileInfo {
        const tile = {...this.getTileByPosition(x, y, z)}
        const tilePos = this.getTileOriginPosition(x, y)
        if (tile.objectGroups) {        
            for (let object of tile.objectGroups) {
                const hit = Hit.getHitbox(object, {
                    x: tilePos.x,
                    y: tilePos.y
                })
                if (hit.type) {
                    const collided = Hit.testPolyCollision(hit.type, hit.hitbox, hitbox)
                    if (collided) {
                        tile.hasCollision = true
                    }
                }
            }
        }
        return tile
    }

    /**
     * Assign the map to a world

     * @title Assign the map to a world
     * @method map.setInWorldMaps(name)
     * @param {RpgWorldMaps} worldMap world maps
     * @since 3.0.0-beta.8
     * @memberof Map
     */
    setInWorldMaps(worldMap: RpgCommonWorldMaps) {
        this.worldMapParent = worldMap
    }

    /**
     * Remove this map from the world
     * @title Remove this map from the world
     * @method map.removeFromWorldMaps()
     * @returns {boolean | undefined}
     * @since 3.0.0-beta.8
     * @memberof Map
     */
    removeFromWorldMaps(): boolean | undefined {
        return this.worldMapParent?.removeMap(this.id)
    }

     /**
     * Recover the world attached to this map (`undefined` if no world attached)

     * @title Get attached World
     * @method map.getInWorldMaps()
     * @return {RpgCommonWorldMaps | undefined}
     * @since 3.0.0-beta.8
     * @memberof Map
     */
    getInWorldMaps(): RpgCommonWorldMaps | undefined {
        return this.worldMapParent
    }

    boundingMap(nextPosition: Vector2d, hitbox: SAT): { bounding: boolean, nextPosition: Vector2d } | null {
        let bounding = false
        if (nextPosition.x < 0) {
            nextPosition.x = 0
            bounding = true
        }
        else if (nextPosition.y < 0) {
            nextPosition.y = 0
            bounding = true
        }
        else if (nextPosition.x > this.widthPx - hitbox.w) {
            nextPosition.x = this.widthPx - hitbox.w
            bounding = true
        }
        else if (nextPosition.y > this.heightPx - hitbox.h) {
            nextPosition.y = this.heightPx - hitbox.h
            bounding = true
        }
        return {
            bounding,
            nextPosition
        }
    }

    _createMovingHitbox<T extends RpgCommonGame>(
        gameEngine: T,
        tick$: Observable<Tick>,
        mapId: string,
        hitboxes: Pick<HitBox, 'width' | 'height' | 'x' | 'y'>[],
        options: MovingHitbox = {}
    ): Observable<AbstractObject> {
        const object = new AbstractObject(gameEngine, Utils.generateUID())
        object.disableVirtualGrid = true
        object.map = mapId
        object.speed = options.speed ?? 1
        let i = 0
        let frame = 0
        const destroyHitbox$ = new Subject<AbstractObject>()
        return tick$.pipe(
            takeUntil(destroyHitbox$),
            filter(() => {
                frame++
                return frame % object.speed == 0
            }),
            map(() => {
                const hitbox = hitboxes[i]
                if (!hitbox) {
                    destroyHitbox$.next(object)
                    destroyHitbox$.complete()
                    return object
                }
                object.position.x = hitbox.x
                object.position.y = hitbox.y
                object.setHitbox(hitbox.width, hitbox.height)
                i++
                return object
            }),
            mergeMap((object) => from(object.isCollided(object.position, { allSearch: true }))),
            map(() => object)
        )
    }
}
