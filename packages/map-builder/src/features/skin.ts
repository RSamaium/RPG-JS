import { Container } from "pixi.js";
import type { FeatureHost } from "../renderer/feature";
import type { SkinLayer, SkinLayerFactory } from "../skins/types";

/**
 * Puts skin layers in the overlay stage and keeps them up to date: they redraw when
 * the interaction state changes, when the map changes, and animate on each tick.
 * Returns the function that removes them.
 */
export function mountSkinLayers(host: FeatureHost, factories: ReadonlyArray<SkinLayerFactory | undefined>): () => void {
  const containers: Container[] = [];
  const layers: SkinLayer[] = [];
  const refresh = (): void => {
    const snapshot = host.interaction.state.get();
    for (const layer of layers) layer.update(snapshot);
  };

  for (const factory of factories) {
    if (!factory) continue;
    const container = new Container();
    host.stages.overlay.addChild(container);
    containers.push(container);
    layers.push(factory({ layer: container, textures: host.textures, assets: host.assets, nodes: host.describe, requestUpdate: refresh }));
  }

  const stops = [
    host.interaction.state.subscribe(refresh),
    // The view subscribed to the model before any feature, so the scene is already up to date here.
    host.model.subscribe(refresh),
    host.onTick((deltaMs) => layers.forEach((layer) => layer.tick?.(deltaMs))),
  ];
  refresh();

  return () => {
    stops.forEach((stop) => stop());
    layers.forEach((layer) => layer.destroy());
    containers.forEach((container) => container.destroy({ children: true }));
  };
}
