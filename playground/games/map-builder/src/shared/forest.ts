import { defineMap, el, event } from "@rpgjs/map-builder/model";
import { assets } from "./assets";
import { forestGround } from "./terrain";

const tree = (id: string, x: number, y: number) => el("tree", { id, x, y, data: { hits: 3 } });

/**
 * The forest, written in code. A wall of fence crosses the north, with a gate in it that the lever
 * opens; behind it, wood waits.
 */
export const forest = defineMap(assets, {
  id: "forest",
  size: [960, 640],
  tileSize: 32,
  terrain: forestGround,
  elements: [
    tree("tree-1", 120, 130),
    tree("tree-2", 220, 300),
    tree("tree-3", 640, 250),
    tree("tree-4", 770, 420),
    tree("tree-5", 840, 140),
    tree("tree-6", 430, 420),
    tree("tree-7", 320, 520),
    tree("tree-8", 700, 540),
    el("fence", { id: "fence-1", x: 320, y: 120 }),
    el("fence", { id: "fence-2", x: 384, y: 120 }),
    el("fence", { id: "gate", x: 448, y: 120 }),
    el("fence", { id: "fence-3", x: 512, y: 120 }),
    el("fence", { id: "fence-4", x: 576, y: 120 }),
  ],
  events: [
    event("lever", { id: "lever", x: 190, y: 120, data: { target: "gate" } }),
    event("prize", { id: "prize-1", x: 440, y: 70 }),
    event("prize", { id: "prize-2", x: 480, y: 70 }),
    event("prize", { id: "prize-3", x: 520, y: 70 }),
  ],
});
