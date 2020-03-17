import { Renderer } from 'lance-gg';
import Fighter from './../common/Fighter';

let PIXI = require('pixi.js');
let game = null;

export default class BrawlerRenderer extends Renderer {

    constructor(gameEngine, clientEngine) {
        super(gameEngine, clientEngine);
        game = gameEngine;
        this.sprites = {};
        this.fighterSpriteScale = 1;
    }

    get ASSETPATHS() {
        return {
            background: 'assets/deserttileset/png/BG.png',
            groundLeft: 'assets/deserttileset/png/Tile/1.png',
            groundMiddle: 'assets/deserttileset/png/Tile/2.png',
            groundRight: 'assets/deserttileset/png/Tile/3.png',
            platformLeft: 'assets/deserttileset/png/Tile/14.png',
            platformMiddle: 'assets/deserttileset/png/Tile/15.png',
            platformRight: 'assets/deserttileset/png/Tile/16.png',
            desertStuff_0: 'assets/deserttileset/png/Objects/Bush (1).png',
            desertStuff_1: 'assets/deserttileset/png/Objects/Tree.png',
            desertStuff_2: 'assets/deserttileset/png/Objects/Cactus (1).png',
            desertStuff_3: 'assets/deserttileset/png/Objects/Stone.png',
            desertStuff_4: 'assets/deserttileset/png/Objects/Skeleton.png',
            idleSheet: 'assets/adventure_girl/png/Idle.json',
            jumpSheet: 'assets/adventure_girl/png/Jump.json',
            meleeSheet: 'assets/adventure_girl/png/Melee.json',
            runSheet: 'assets/adventure_girl/png/Run.json',
            dieSheet: 'assets/adventure_girl/png/Dead.json',
            dinoIdleSheet: 'assets/dino/png/Idle.json',
            dinoJumpSheet: 'assets/dino/png/Jump.json',
            dinoWalkSheet: 'assets/dino/png/Walk.json',
            dinoRunSheet: 'assets/dino/png/Run.json',
            dinoDieSheet: 'assets/dino/png/Dead.json'
        };
    }

    // expand viewport to maximize width or height
    setDimensions() {
        this.pixelsPerSpaceUnit = window.innerWidth / this.gameEngine.spaceWidth;
        if (window.innerHeight < game.spaceHeight * this.pixelsPerSpaceUnit) {
            this.pixelsPerSpaceUnit = window.innerHeight / game.spaceHeight;
        }
        this.viewportWidth = game.spaceWidth * this.pixelsPerSpaceUnit;
        this.viewportHeight = game.spaceHeight * this.pixelsPerSpaceUnit;
    }

    // initialize renderer.
    init() {
        this.setDimensions();
        this.stage = new PIXI.Container();

        if (document.readyState === 'complete' || document.readyState === 'loaded' || document.readyState === 'interactive')
            this.onDOMLoaded();
        else
            document.addEventListener('DOMContentLoaded', this.onDOMLoaded.bind(this));

        return new Promise((resolve, reject) => {
            PIXI.loader.add(Object.keys(this.ASSETPATHS).map((x) => {
                return {
                    name: x,
                    url: this.ASSETPATHS[x]
                };
            }))
            .load(() => {
                this.isReady = true;
                this.setupStage();

                this.textures = {
                    IDLE: Object.values(PIXI.loader.resources.idleSheet.textures),
                    JUMP: Object.values(PIXI.loader.resources.jumpSheet.textures),
                    FIGHT: Object.values(PIXI.loader.resources.meleeSheet.textures),
                    RUN: Object.values(PIXI.loader.resources.runSheet.textures),
                    DIE: Object.values(PIXI.loader.resources.dieSheet.textures),
                    DINO_IDLE: Object.values(PIXI.loader.resources.dinoIdleSheet.textures),
                    DINO_WALK: Object.values(PIXI.loader.resources.dinoWalkSheet.textures),
                    DINO_RUN: Object.values(PIXI.loader.resources.dinoRunSheet.textures),
                    DINO_JUMP: Object.values(PIXI.loader.resources.dinoJumpSheet.textures),
                    DINO_DIE: Object.values(PIXI.loader.resources.dinoDieSheet.textures)
                };

                if (isTouchDevice()) document.body.classList.add('touch');
                else if (isMacintosh()) document.body.classList.add('mac');
                else if (isWindows()) document.body.classList.add('pc');

                resolve();
                this.gameEngine.emit('renderer.ready');
            });
        });

    }

    // add background sprite
    setupStage() {
        window.addEventListener('resize', () => {
            this.setDimensions();
            this.renderer.resize(this.viewportWidth, this.viewportHeight);
        });
        this.stage.backgroundSprite = new PIXI.Sprite(PIXI.loader.resources.background.texture);
        this.stage.backgroundSprite.width = this.viewportWidth;
        this.stage.backgroundSprite.height = this.viewportHeight;
        this.stage.addChild(this.stage.backgroundSprite);
    }

    onDOMLoaded() {
        let options = {
            width: this.viewportWidth,
            height: this.viewportHeight,
            antialias: true,
            autoResize: true,
            resolution: window.devicePixelRatio || 1
        };
        this.renderer = PIXI.autoDetectRenderer(options);
        document.body.querySelector('.pixiContainer').appendChild(this.renderer.view);
    }

    platformTextures(obj) {
        if (obj.y === 0) {
            return {
                left: PIXI.loader.resources.groundLeft.texture,
                middle: PIXI.loader.resources.groundMiddle.texture,
                right: PIXI.loader.resources.groundRight.texture
            };
        }
        return {
            left: PIXI.loader.resources.platformLeft.texture,
            middle: PIXI.loader.resources.platformMiddle.texture,
            right: PIXI.loader.resources.platformRight.texture
        };
    }

    randomInt(max) {
        return Math.floor(Math.random() * Math.floor(max));
    }

    // add a single platform game object
    addPlatform(obj) {

        // create sprites for platform edges, and middle-section
        let textures = this.platformTextures(obj);
        let edgeWidth = game.platformUnit;
        let middleWidth = obj.width - (2 * edgeWidth);
        let sprite = new PIXI.Container();
        let leftEdge = new PIXI.Sprite(textures.left);
        let rightEdge = new PIXI.Sprite(textures.right);
        let middle = new PIXI.extras.TilingSprite(textures.middle);
        let middleHeight = edgeWidth / middle.texture.width * middle.texture.height;

        // scale the sprites and tile, set the middle-section width
        let scale = edgeWidth * this.pixelsPerSpaceUnit / leftEdge.width;
        leftEdge.scale.set(scale, scale);
        rightEdge.scale.set(scale, scale);
        middle.tileScale.set(scale, scale);
        middle.width = middleWidth * this.pixelsPerSpaceUnit;
        middle.height = middleHeight * this.pixelsPerSpaceUnit;

        // position the sprites inside container
        middle.x = edgeWidth * this.pixelsPerSpaceUnit;
        rightEdge.x = middle.x + middleWidth * this.pixelsPerSpaceUnit;
        sprite.addChild(leftEdge);
        sprite.addChild(middle);
        sprite.addChild(rightEdge);

        // add desert stuff
        let stuffCount = Math.max(1, obj.width / game.platformUnit / 4);
        for (let i = 0; i < stuffCount; i++) {
            let stuff = PIXI.loader.resources['desertStuff_' + this.randomInt(5)];
            let stuffSprite = new PIXI.Sprite(stuff.texture);
            stuffSprite.scale.set(scale, scale);
            stuffSprite.x = this.randomInt(rightEdge.x);
            stuffSprite.y = 0 - (stuffSprite.height);
            sprite.addChild(stuffSprite);
        }
        this.sprites[obj.id] = sprite;
        sprite.position.set(obj.position.x, obj.position.y);
        this.stage.addChild(sprite);
    }

    // add a single fighter game object
    addFighter(obj) {
        let sprite = new PIXI.Container();
        sprite.fighterSprite = new PIXI.extras.AnimatedSprite(this.textures.IDLE,PIXI.SCALE_MODES.NEAREST);
        this.fighterSpriteScale = obj.height * this.pixelsPerSpaceUnit / sprite.fighterSprite.height;
        sprite.fighterSprite.scale.set(this.fighterSpriteScale, this.fighterSpriteScale);
        sprite.fighterSprite.anchor.set(0.25, 0.0);
        sprite.addChild(sprite.fighterSprite);
        this.sprites[obj.id] = sprite;
        sprite.position.set(obj.position.x, obj.position.y);
        this.stage.addChild(sprite);
    }

    // remove a fighter
    removeFighter(obj) {
        let sprite = this.sprites[obj.id];
        if (sprite) {
            if (sprite.fighterSprite) sprite.fighterSprite.destroy();
            sprite.destroy();
        }
    }

    // draw all game objects
    draw(t, dt) {
        super.draw(t, dt);

        if (!this.isReady) return; // assets might not have been loaded yet

        game.world.forEachObject((id, obj) => {
            let sprite = this.sprites[obj.id];
            let spriteOffsetY = 0;
            if (obj instanceof Fighter) {
                if (obj.isDino) {
                    sprite.fighterSprite.textures = this.textures[`DINO_${Fighter.getActionName(obj.action)}`]
                    spriteOffsetY = -3;
                } else {
                    sprite.fighterSprite.textures = this.textures[Fighter.getActionName(obj.action)];
                    spriteOffsetY = -1;
                }

                let textureCount = sprite.fighterSprite.textures.length;
                let progress = (99 - obj.progress)/100;
                if (obj.action === Fighter.ACTIONS.JUMP) {
                    progress = (obj.velocity.y + this.gameEngine.jumpSpeed) / (this.gameEngine.jumpSpeed * 2);
                    if (progress < 0) progress = 0;
                    if (progress >= 1) progress = 0.99;
                }
                let image = Math.floor(progress * textureCount);
                sprite.fighterSprite.gotoAndStop(image);

                sprite.fighterSprite.scale.set(obj.direction * this.fighterSpriteScale, this.fighterSpriteScale);
                sprite.fighterSprite.anchor.x = obj.direction==1?0.25:0.75;

                if (obj.playerId === this.gameEngine.playerId)
                    document.getElementById('killsStatus').innerHTML = `kills: ${obj.kills}`;
            }
            sprite.x = obj.position.x * this.pixelsPerSpaceUnit;
            sprite.y = this.viewportHeight - (obj.position.y + obj.height + spriteOffsetY) * this.pixelsPerSpaceUnit;
        });

        this.renderer.render(this.stage);
    }
}

function isMacintosh() { return navigator.platform.indexOf('Mac') > -1; }
function isWindows() { return navigator.platform.indexOf('Win') > -1; }
function isTouchDevice() { return 'ontouchstart' in window || navigator.maxTouchPoints; }
