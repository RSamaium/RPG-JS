export default class ImageLayer extends PIXI.Container {
  constructor(layer, route) {
    super();

    Object.assign(this, layer);
    this.alpha = layer.opacity;

    if (layer.image && layer.image.source) {
      this.addChild(PIXI.Sprite.from(`${route}/${layer.image.source}`));
    }
  }
}