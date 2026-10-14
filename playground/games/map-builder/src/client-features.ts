import { elements, placement, selection, terrain, type TerrainOptions } from "@rpgjs/map-builder/features";
import { inlineTerrainBackend, workerTerrainBackend } from "@rpgjs/map-builder/terrain-render";
import TerrainWorker from "@rpgjs/map-builder/terrain-render/worker?worker";
import { catalog, moveRules, placementRules, terrainRules } from "./shared/rules";

/**
 * What a player sees and can do. The rules are the ones the server decides with, so the ghost
 * turns red for exactly the reasons the server would refuse.
 *
 * The kernel that renders the ground runs in a pool of workers: painting does not take a frame from the game.
 * Without workers (a test, an old browser) it falls back to the calling thread.
 */
export const createFeatures = (terrainOptions: TerrainOptions = {}) =>
  [
    terrain({
      pipeline: terrainRules,
      // Tilling is part of the game, not only of the editor.
      brushModes: ["play", "edit"],
      backend: () => (typeof Worker === "undefined" ? inlineTerrainBackend() : workerTerrainBackend({ createWorker: () => new TerrainWorker() })),
      ...terrainOptions,
    }),
    elements({ pipeline: { move: moveRules } }),
    selection({ drag: { live: false }, remove: true }),
    placement({ catalog, pipeline: placementRules }),
  ] as const;

export const features = createFeatures();
