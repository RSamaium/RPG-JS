import { defineModule } from "@rpgjs/common";
import type { RpgPlayer, RpgServer } from "@rpgjs/server";
import { buildStudioElementCollisions, isStudioElementHitboxId, STUDIO_ELEMENT_COLLISIONS_CHANNEL, type StudioElementCollisionsMessage } from "./element-collisions";

/** The most elements a message may carry: a map has far fewer, a larger list is not from the editor. */
const MAX_ELEMENTS = 50000;

export interface StudioElementCollisionsServerOptions {
  /** Who may change the collisions of the map the player is on. A player who may not is ignored. */
  readonly authorize: (player: RpgPlayer) => boolean | Promise<boolean>;
}

/**
 * The server side of the collisions that follow a map editor. When a client that edits the map tells where its placed
 * elements are now (`context.rebuildElementCollisions` of a Studio map extension), the hitboxes the elements of the map
 * make are replaced on the map the player is on, by the rules of the map load, from the tilesets the server holds: the
 * client says where the elements are, never what their hitboxes are. Install it with `provideServerModules`:
 *
 * ```ts
 * provideServerModules([createStudioElementCollisionsServer({ authorize: (player) => isAllowedToEdit(player) })])
 * ```
 *
 * The collisions of the other players of an online game are decided by the server, so they follow at once; their own
 * prediction is rebuilt when they load the map again.
 */
export function createStudioElementCollisionsServer(options: StudioElementCollisionsServerOptions): RpgServer {
  const bound = new WeakSet<object>();
  const bind = (player: RpgPlayer): void => {
    if (bound.has(player)) return;
    bound.add(player);
    player.on(STUDIO_ELEMENT_COLLISIONS_CHANNEL, async (raw: unknown) => {
      const message = raw as Partial<StudioElementCollisionsMessage> | null;
      if (!message || !Array.isArray(message.elementsLow) || message.elementsLow.length > MAX_ELEMENTS) return;
      const map = player.getCurrentMap() as { data?: () => unknown; replaceStaticHitboxes?: (match: (id: string) => boolean, hitboxes: unknown[]) => void } | null;
      if (!map?.replaceStaticHitboxes) return;
      if (!(await options.authorize(player))) return;
      map.replaceStaticHitboxes(isStudioElementHitboxId, buildStudioElementCollisions(map.data?.(), message.elementsLow));
    });
  };
  return defineModule<RpgServer>({
    player: {
      onConnected: (player: RpgPlayer) => bind(player),
      onJoinMap: (player: RpgPlayer) => bind(player),
    },
  });
}
