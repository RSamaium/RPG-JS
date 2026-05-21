// @vitest-environment jsdom

import { describe, expect, test, vi } from "vitest";
import { HotbarManager } from "./HotbarManager";
import { resolveHotbarOptions } from "./options";
import type { HotbarEntrySource } from "./types";

function createHotbar(sources: HotbarEntrySource[] = []) {
  return new HotbarManager(undefined, resolveHotbarOptions({
    slots: 3,
    bindings: ["1", "2", "3"],
    storageKey: false,
  }), sources);
}

describe("HotbarManager", () => {
  test("assigns refs and resolves entries from registered sources", () => {
    const hotbar = createHotbar([
      {
        id: "combat",
        resolve: () => [
          {
            ref: { type: "skill", id: "fireball" },
            label: "Fireball",
            rarity: "rare",
          },
        ],
      },
    ]);

    expect(hotbar.assign(0, { type: "skill", id: "fireball" })).toBe(true);
    expect(hotbar.slots()[0]).toMatchObject({
      binding: "1",
      empty: false,
      disabled: false,
      missing: false,
      entry: {
        label: "Fireball",
      },
    });
  });

  test("marks missing assigned refs as disabled placeholder slots", () => {
    const hotbar = createHotbar();

    hotbar.assign(1, { type: "item", id: "potion" });

    expect(hotbar.slots()[1]).toMatchObject({
      empty: false,
      disabled: true,
      missing: true,
      entry: {
        label: "item:potion",
      },
    });
  });

  test("moves and clears slots without changing the slot count", () => {
    const hotbar = createHotbar();

    hotbar.assign(0, { type: "skill", id: "slash" });
    hotbar.move(0, 2);

    expect(hotbar.state().refs).toEqual([
      null,
      null,
      { type: "skill", id: "slash" },
    ]);

    hotbar.clear(2);
    expect(hotbar.state().refs).toEqual([null, null, null]);
  });

  test("triggers input actions through the client engine", async () => {
    const processAction = vi.fn();
    const hotbar = createHotbar([
      {
        id: "combat",
        resolve: () => [
          {
            ref: { type: "action", id: "shoot" },
            label: "Shoot",
            action: {
              type: "input",
              input: "projectile:shoot",
              data: ({ slotIndex }) => ({ slotIndex }),
            },
          },
        ],
      },
    ]);
    (hotbar as any).client = { processAction };

    hotbar.assign(0, { type: "action", id: "shoot" });

    await expect(hotbar.trigger(0)).resolves.toBe(true);
    expect(processAction).toHaveBeenCalledWith("projectile:shoot", { slotIndex: 0 });
  });

  test("opens assignment on the first free slot", () => {
    const hotbar = createHotbar();

    const index = hotbar.assignFirstAvailable({
      ref: { type: "item", id: "potion" },
      label: "Potion",
    });

    expect(index).toBe(0);
    expect(hotbar.state().refs[0]).toEqual({ type: "item", id: "potion" });
  });
});
