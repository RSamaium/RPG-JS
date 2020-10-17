import * as PIXI from 'pixi.js'
import { RpgCommonMap } from '@rpgjs/common'
import TileMap from '../Tilemap'
import { Viewport } from 'pixi-viewport'
import { IScene } from '../Interfaces/Scene'
import { Scene } from './Scene'
import { spritesheets } from '../Sprite/Spritesheets'

export class SceneMap extends Scene implements IScene {

    private tilemap: any
    private viewport: Viewport | undefined
    private players: object = {}
    private eventSprites: object = {}
    private isLoaded: boolean = false
    private gameMap
  
    constructor(
            protected game: any, 
            private options: { screenWidth?: number, screenHeight?: number } = {}) {
        super(game)
    }

    load(obj) {
        this.gameMap = new RpgCommonMap()
        this.gameMap.load(obj)
        if (!this.game.standalone) RpgCommonMap.buffer.set(obj.id, this.gameMap)

        this.tilemap = new TileMap(obj, this.game.renderer)

        const loader = PIXI.Loader.shared

        for (let tileset of this.tilemap.tileSets) {
            loader.add(tileset.name, tileset.spritesheet.image)
        }

        loader.load((loader, resources) => {
            for (let tileset of this.tilemap.tileSets) {
                const spritesheet = spritesheets.get(tileset.name)
                spritesheet.resource = resources[tileset.name]
            }
        })

        return new Promise((resolve, reject) => {
            loader.onError.add(() => {
                reject()
            })
            loader.onComplete.add(() => {
                this.tilemap.load(obj)
                this.viewport = new Viewport({
                    screenWidth: this.options.screenWidth,
                    screenHeight: this.options.screenHeight,
                    worldWidth: obj.width * obj.tileWidth,
                    worldHeight: obj.height * obj.tileHeight
                })

                this.viewport.clamp({ direction: 'all' })
                this.viewport.addChild(this.tilemap)
                this.isLoaded = true
                resolve(this.viewport)
            })
        })
    }

    draw(t, dt) {
        if (!this.isLoaded) {
            return
        }
        super.draw(t, dt)
        for (let eventId in this.game.events) {
            const sprite = this.eventSprites[eventId]
            const event = this.game.events[eventId]
            if (sprite) {
                sprite.update(event)
            } 
            else {
                this.addEvent(event)
            }
        }
    }

    onUpdateObject({ moving, instance }) {
        const { x, y, tilesOverlay, anchor, width, height } = instance
        if (moving) {
            tilesOverlay.removeChildren()
            const addTile = (x, y) => {
                const tiles = this.tilemap.createOverlayTiles(x, y, instance)
                if (tiles.length) tilesOverlay.addChild(...tiles)
            }
            let _x = x - (width * anchor.x)
            let _y = y - (height * anchor.y)
            addTile(_x, _y)
            addTile(_x + height, _y)
            addTile(_x, _y + height)
            addTile(_x + width, _y + height)
        }
    }

    setPlayerPosition(id, { x, y }) {
        this.players[id].x = x
        this.players[id].y = y
    }

    addEvent(obj) {
        const sprite = new this.game._eventClass(obj, this)
        sprite.load()
        this.eventSprites[obj.id] = sprite
        this.tilemap.getEventLayer().addChild(sprite)
    }

    addObject(obj, id) {

        if (!obj.map) {
            return
        }

        const wrapper = new PIXI.Container()
        const tilesOverlay = new PIXI.Container()

        const sprite = new this.game._playerClass(obj, this)
        sprite.load()
        sprite.tilesOverlay = tilesOverlay

        wrapper.addChild(sprite, tilesOverlay)

        this.objects.set(id, sprite)
        this.tilemap.getEventLayer().addChild(wrapper)

        sprite['isCurrentPlayer'] = obj.playerId === this.game.playerId

        if (sprite['isCurrentPlayer']) this.viewport?.follow(sprite)

        this.onUpdateObject({
            moving: true,
            instance: sprite
        })
    }

    removeObject(id) {
        let sprite =  this.objects.get(id)
        if (sprite) {
            this.objects.delete(id)
            sprite.destroy()
        }
    }

    updateEvent(eventId, data) {
        const event = this.game.events.find(ev => ev.id == eventId)
        event.position.x = data.x 
        event.position.y = data.y
    }
    
}