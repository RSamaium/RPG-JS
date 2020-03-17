import * as PIXI from 'pixi.js';

import ImageLayer from './ImageLayer';
import TileLayer from './TileLayer';
import TileSet from './TileSet';

PIXI.settings.SCALE_MODE = PIXI.SCALE_MODES.NEAREST;

export default class TileMap extends PIXI.Container {

    constructor(data) {
        super();
        this.data = data
        this.x = 0
        this.y = 0
        Object.assign(this, data)
        this.background = new PIXI.Graphics()
        this.eventsLayer = new PIXI.Container()
    }

    load() {
        this.background.beginFill(0xffffff);
        this.background.drawRect(
            0,
            0,
            (this._width || 0) * (this.tileWidth || 0),
            (this._height || 0) * (this.tileHeight || 0)
        );
        this.background.endFill();
        this.addChild(this.background);

        const route = './assets'

        this.data.tileSets.forEach((tileSet) => {
            this.tileSets.push(new TileSet(route, tileSet));
        });

        this.data.layers.forEach((layerData, index) => {
            layerData.map = this
            if (index == 1) {
                this.addChild(this.eventsLayer) 
            }
            switch (layerData.type) {
                case 'tile': {
                    const tileLayer = new TileLayer(layerData, this.tileSets);
                    this.layers[layerData.name] = tileLayer;
                     this.addChild(tileLayer);
                    break;
                }
                case 'image': {
                    const imageLayer = new ImageLayer(layerData, route);
                    this.layers[layerData.name] = imageLayer;
                    this.addChild(imageLayer);
                    break;
                }
            }
        });
    }
}