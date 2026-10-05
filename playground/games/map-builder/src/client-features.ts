import { elements, placement, selection } from "@rpgjs/map-builder/features";
import { catalog, moveRules, placementRules } from "./shared/rules";

/**
 * What a player sees and can do. The rules are the ones the server decides with, so the ghost
 * turns red for exactly the reasons the server would refuse.
 */
export const features = [
  elements({ pipeline: { move: moveRules } }),
  selection({ drag: { live: false }, remove: true }),
  placement({ catalog, pipeline: placementRules }),
] as const;
