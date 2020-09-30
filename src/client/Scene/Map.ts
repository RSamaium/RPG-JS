import * as PIXI from 'pixi.js'
import GameMap from '../../common/Map'
import TileMap from '../Tilemap'
import { Viewport } from 'pixi-viewport'
import { IScene } from '../Interfaces/Scene'
import { Scene } from './Scene'

export class SceneMap extends Scene implements IScene {

    private tilemap: any = new TileMap()
    private viewport: Viewport | undefined
    private players: object = {}
    private eventSprites: object = {}

    constructor(
            protected game: any, 
            private options: { screenWidth?: number, screenHeight?: number } = {}) {
        super(game)
    }

    load(obj): PIXI.Container {

        const gameMap = new GameMap()
        gameMap.load(obj)
        if (!this.game.standalone) GameMap.buffer.set(obj.id, gameMap)

        this.tilemap.load(obj)

        this.viewport = new Viewport({
            screenWidth: this.options.screenWidth,
            screenHeight: this.options.screenHeight,
            worldWidth: obj.width * obj.tileWidth,
            worldHeight: obj.height * obj.tileHeight
        })

        this.viewport.clamp({ direction: 'all' })
        this.viewport.addChild(this.tilemap)

        return this.viewport
    }

    draw(t, dt) {
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

    getPlayer(id) {
        return this.players[id]
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

        const sprite = new this.game._playerClass(obj, this)
        sprite.load()

        this.objects.set(id, sprite)
        this.tilemap.getEventLayer().addChild(sprite)

        sprite['isCurrentPlayer'] = obj.playerId === this.game.playerId

        if (sprite['isCurrentPlayer']) this.viewport?.follow(sprite)
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