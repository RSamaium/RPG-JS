import { describe, expect, it, vi } from "vitest";
import { STUDIO_ELEMENT_COLLISIONS_CHANNEL } from "./element-collisions";
import { createStudioElementCollisionsServer } from "./element-collisions-server";

const mapData = {
  data: {
    params: {
      width: 4,
      height: 2,
      tileset: { _id: "tileset", metadata: { elements: [{ id: 0, rect: [0, 0, 48, 48], hitbox: { x: 0, y: 24, width: 48, height: 24 } }] } },
    },
  },
};

const setup = (authorize: (player: unknown) => boolean | Promise<boolean>) => {
  const replaceStaticHitboxes = vi.fn();
  const map = { data: () => mapData, replaceStaticHitboxes };
  const handlers = new Map<string, (payload: unknown) => unknown>();
  const player = { on: (key: string, handler: (payload: unknown) => unknown) => void handlers.set(key, handler), getCurrentMap: () => map };
  const module = createStudioElementCollisionsServer({ authorize }) as any;
  module.player.onConnected(player);
  module.player.onJoinMap(player); // a second hook does not listen twice
  return { replaceStaticHitboxes, send: (payload: unknown) => handlers.get(STUDIO_ELEMENT_COLLISIONS_CHANNEL)?.(payload), handlers };
};

describe("the collisions of the placed elements, on the server", () => {
  it("replaces the hitboxes of the elements of the map the player is on, for a player who may", async () => {
    const { send, replaceStaticHitboxes } = setup(() => true);
    await send({ elementsLow: [{ id: 0, tilesetId: "tileset", x: 96, y: 48 }] });
    expect(replaceStaticHitboxes).toHaveBeenCalledTimes(1);
    const [match, hitboxes] = replaceStaticHitboxes.mock.calls[0]!;
    expect(match("studio-element:4")).toBe(true);
    expect(match("wall")).toBe(false);
    expect(hitboxes).toEqual([expect.objectContaining({ id: "studio-element:0", x: 96, y: 72, width: 48, height: 24 })]);
  });

  it("does nothing for a player who may not", async () => {
    const { send, replaceStaticHitboxes } = setup(async () => false);
    await send({ elementsLow: [{ id: 0, tilesetId: "tileset", x: 96, y: 48 }] });
    expect(replaceStaticHitboxes).not.toHaveBeenCalled();
  });

  it("ignores what is not a list of elements", async () => {
    const { send, replaceStaticHitboxes } = setup(() => true);
    await send(null);
    await send({ elementsLow: "x" });
    await send({ elementsLow: new Array(50001).fill({}) });
    expect(replaceStaticHitboxes).not.toHaveBeenCalled();
  });

  it("listens once per player", () => {
    const on = vi.fn();
    const module = createStudioElementCollisionsServer({ authorize: () => true }) as any;
    const player = { on, getCurrentMap: () => null };
    module.player.onConnected(player);
    module.player.onJoinMap(player);
    expect(on).toHaveBeenCalledTimes(1);
  });
});
