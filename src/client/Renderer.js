window.PIXI = require('pixi.js');

import { Renderer } from 'lance-gg';
import { Viewport } from 'pixi-viewport'
import TileMap from './core/Tilemap'
import Character from './core/Sprite/Character';

let game = null

export default class RpgRenderer extends Renderer {

    get ASSETPATHS() {
        return {
            tileset: 'assets/tileset.png',
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
        this.tilemap = new TileMap(obj)
        this.tilemap.load()

        this.viewport = new Viewport({
            screenWidth: this.options.width,
            screenHeight: this.options.height,
            worldWidth: obj.width * obj.tileWidth,
            worldHeight: obj.height * obj.tileHeight
        })

        this.viewport.clamp({ direction: 'all' })

        this.stage.addChild(this.viewport)

        this.viewport.addChild(this.tilemap)

        /*this.viewport.resize({
            worldWidth: obj.width * obj.tileWidth,
            worldHeight: obj.height * obj.tileHeight
        })*/
        
    }

    addPlayer(obj) {
        obj.image = {
            source: 'chara.png',
            width: 128,
            height: 192,
            framesWidth: 4,
            framesHeight: 4
        }
        const sprite = new Character(obj)
        sprite.load()
        this.sprites[obj.id] = sprite
        this.tilemap.eventsLayer.addChild(sprite)
        if (obj.playerId === this.gameEngine.playerId) {
            this.viewport.follow(sprite)
        }  
    }

    removePlayer(obj) {
        let sprite = this.sprites[obj.id];
        if (sprite) {
            delete this.sprites[obj.id]
            sprite.destroy();
        }
    }
}
