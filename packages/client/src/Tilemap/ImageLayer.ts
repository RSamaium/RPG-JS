import { CommonLayer } from './CommonLayer';

export default class ImageLayer extends CommonLayer {
  applyProperties() {
    super.applyProperties()
    const engine = this.map['renderer']['clientEngine']
    if (this.layer.image && this.layer.image.source && engine) {
      const { width, height, source } = this.layer.image
      const data = this.map.getData()
      const texture = PIXI.Texture.from(engine.getResourceUrl(source))
      const tilingSprite = new PIXI.TilingSprite(
          texture,
          this.layer.repeatx ? data.width * data.tilewidth : width,
          this.layer.repeaty ? data.height * data.tileheight : height
      )
      this.addChild(tilingSprite)
    }
  }
}