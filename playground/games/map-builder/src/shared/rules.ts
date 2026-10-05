import { defineCatalog, maxCount, protectedZone, requireFree, snapToGrid, withinMap, type PipelineStep } from "@rpgjs/map-builder/interaction";

/** Where nobody may build: the spot players appear at, and the way to the reward behind the gate. */
export const PROTECTED_ZONES = [
  { x: 64, y: 440, width: 180, height: 170 },
  { x: 300, y: 40, width: 360, height: 140 },
];

/**
 * Wood is the price of a tree. The player lives on the server: a client does not know how much
 * wood anyone has, so it only previews, and the server counts. The charge comes last, so a
 * placement that is refused for any other reason costs nothing.
 */
export const chargeWood: PipelineStep<"element.place"> = (intent, context, next) => {
  const player = context.actor as { getVariable?(name: string): unknown; setVariable?(name: string, value: unknown): void } | undefined;
  if (!player?.getVariable) return next(); // a client previewing
  const wood = Number(player.getVariable("wood") ?? 0);
  if (wood < 1) return context.reject("not-enough-wood", "You need 1 wood to plant a tree");
  if (!context.preview) player.setVariable?.("wood", wood - 1);
  return next();
};

/** What can be planted. The rules of an item come after those of the placement. */
export const catalog = defineCatalog([
  { id: "oak", sprite: "tree", data: { hits: 3 }, pipeline: [chargeWood] },
  { id: "bush", sprite: "bush" },
]);

/** The rules every placement goes through, on the client to preview and on the server to decide. */
export const placementRules: PipelineStep<"element.place">[] = [
  snapToGrid(32),
  withinMap(),
  requireFree(),
  protectedZone(PROTECTED_ZONES),
  maxCount("tree", 14),
];

/** Moving what you planted is allowed anywhere you could plant it. */
export const moveRules: PipelineStep<"element.move">[] = [withinMap(), requireFree(), protectedZone(PROTECTED_ZONES)];
