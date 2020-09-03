window.PIXI = require('pixi.js');

import { Renderer } from 'lance-gg';
import { Viewport } from 'pixi-viewport'
import TileMap from './core/Tilemap'
import Character from './core/Sprite/Character';
import Player from './core/Game/Player';
import Map from '../common/Map';

let game = null

export default class RpgRenderer extends Renderer {

    get ASSETPATHS() {
        return {
            tileset: 'assets/maps/tileset.png'
        };
    }

    constructor(gameEngine, clientEngine) {
        super(gameEngine, clientEngine);
        game = gameEngine;
        this.sprites = {};
        this.textures = {}
        this.options = {
            height: 600,
            width: 600
        }
        this.sprites = {}
        this.currentPlayer = null
        this.tilemap = new TileMap()
    }

    init() {

        this.stage = new PIXI.Container();

        if (document.readyState === 'complete' || document.readyState === 'loaded' || document.readyState === 'interactive')
            this.onDOMLoaded();
        else
            document.addEventListener('DOMContentLoaded', this.onDOMLoaded.bind(this));

        /*return new Promise((resolve, reject) => {
            for (let name in this.ASSETPATHS) {
                this.textures[name] = PIXI.Texture.from(this.ASSETPATHS[name])
            }
            resolve()
        });*/

      /*  this.viewport = new Viewport({
            screenWidth: this.options.width,
            screenHeight: this.options.height,
            worldWidth: 30 * 32,
            worldHeight: 30 * 32
        })*/

        


        return Promise.resolve()


    }

    onDOMLoaded() {
        let options = {
            ...this.options,
            antialias: true,
            autoResize: true,
            resolution: window.devicePixelRatio || 1
        };
        this.renderer = PIXI.autoDetectRenderer(options);
        document.body.querySelector('.pixiContainer').appendChild(this.renderer.view);
    }

    draw(t, dt) {
        super.draw(t, dt);
        game.world.forEachObject((id, obj) => {
            let sprite = this.sprites[obj.id];
            sprite.update(obj)
        })
        this.renderer.render(this.stage)
    }

    addMap(obj) {

        Map.buffer.set(obj.id, obj)
   
        this.tilemap.load(obj)

        this.viewport = new Viewport({
            screenWidth: this.options.width,
            screenHeight: this.options.height,
            worldWidth: obj.width * obj.tileWidth,
            worldHeight: obj.height * obj.tileHeight
        })

        this.viewport.clamp({ direction: 'all' })

        this.stage.addChild(this.viewport)

        this.viewport.addChild(this.tilemap)

        console.log(this.currentPlayer)

        /*this.viewport.resize({
            worldWidth: obj.width * obj.tileWidth,
            worldHeight: obj.height * obj.tileHeight
        })*/
        
    }

    addPlayer(obj) {
        obj.image = {
            source: 'characters/chara.png',
            width: 128,
            height: 192,
            framesWidth: 4,
            framesHeight: 4
        }
        const sprite = new Player(obj)
        sprite.load()

        this.sprites[obj.id] = sprite
        this.tilemap.eventsLayer.addChild(sprite)

        if (obj.playerId === this.gameEngine.playerId) {
            this.currentPlayer = sprite
            this.viewport.follow(this.currentPlayer)
        }  
    }

    addEvent(obj) {
        console.log(obj)
    }

    removePlayer(obj) {
        let sprite = this.sprites[obj.id];
        if (sprite) {
            delete this.sprites[obj.id]
            sprite.destroy();
        }
    }
}
