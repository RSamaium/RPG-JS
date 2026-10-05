import { defineAssets } from "@rpgjs/map-builder/model";

/**
 * What the maps are made of. The client draws them, the server uses their sizes and hitboxes to
 * know what is in the way, so both load the same table.
 */
export const assets = defineAssets({
  tree: { src: "/tree.png", size: [64, 96], hitbox: [24, 64, 16, 26] },
  bush: { src: "/bush.png", size: [40, 28], hitbox: [4, 12, 32, 14] },
  fence: { src: "/fence.png", size: [64, 32], hitbox: [0, 12, 64, 16] },
});
