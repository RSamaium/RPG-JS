import { jsonMapSource, type MapDefinition } from "@rpgjs/map-builder/model";
import { ownerOnly, rateLimit } from "@rpgjs/map-builder/interaction";
import type { RpgPlayer } from "@rpgjs/server";
import { provideMapBuilder as provideMapBuilderServer } from "@rpgjs/map-builder/server";
import meadowJson from "./maps/meadow.json";
import { defineEvent, refreshHud } from "./modules/main/server";
import { assets } from "./shared/assets";
import { forest } from "./shared/forest";
import { catalog, moveRules, placementRules } from "./shared/rules";

/**
 * Two maps, from two sources: the forest is written in code, the meadow is a JSON file. The map
 * builder does not care where a map comes from.
 */
const json = jsonMapSource({ maps: { meadow: meadowJson } });
const loadMap = async (id: string): Promise<MapDefinition | undefined> => {
  if (id === "forest") return forest;
  return json.load(id).catch(() => undefined);
};

const idOf = (who: unknown): string | undefined => String((who as RpgPlayer | undefined)?.id ?? "") || undefined;

/** The authority of every map: the same rules the clients preview with, plus what only a server can know. */
export const mapBuilderServer = () =>
  provideMapBuilderServer({
    assets,
    maps: loadMap,
    authority: {
      pipeline: {
        move: [...moveRules, ownerOnly({ actor: idOf })],
        remove: [ownerOnly({ actor: idOf })],
      },
      placement: {
        catalog,
        pipeline: [...placementRules, rateLimit({ max: 8, windowMs: 3000 })],
        // Whatever is planted belongs to whoever planted it. This runs once the placement is accepted.
        stamp: (who) => {
          refreshHud(who as RpgPlayer);
          return { owner: idOf(who) ?? "" };
        },
      },
      author: (who) => (who as RpgPlayer).name,
    },
    events: { define: defineEvent },
  });
