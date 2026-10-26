import { defineTerrain, paint } from "@rpgjs/map-builder/terrain";

/**
 * The ground of the forest, painted in code: grass everywhere, a path of dirt, a pond, a bank of rock.
 * Every material is a texture of the assets table; the map only stores which one is under each pixel.
 */
export const forestTerrain = defineTerrain({
  grass: { texture: "terrain-grass", mode: { type: "fade", width: 18, curve: "smooth" } },
  dirt: { texture: "terrain-dirt", mode: { type: "fade", width: 22, curve: "smooth" } },
  water: { texture: "terrain-water", mode: { type: "water", border: true, foam: true }, collision: true, specialType: "water" },
  rock: { texture: "terrain-rock", mode: { type: "hard" } },
});

/** The recipe that writes the mask of the forest. */
export const forestGround = forestTerrain.layers([
  paint.fill("grass"),
  paint.stroke("dirt", { points: [[40, 560], [200, 520], [330, 480], [470, 520], [640, 470], [900, 500]], radius: 26 }),
  paint.circle("water", { x: 760, y: 190, radius: 78 }),
  paint.circle("water", { x: 710, y: 250, radius: 52 }),
  paint.circle("rock", { x: 150, y: 300, radius: 44 }),
  paint.circle("rock", { x: 205, y: 332, radius: 30 }),
]);
