import { RpgCommonPlayer } from "@rpgjs/common";
import { load } from "@signe/sync";
import { describe, expect, test, vi } from "vitest";

describe("synchronized object signals", () => {
  test("loads nested object fields into the signal value", () => {
    const player = new RpgCommonPlayer();
    const subscriber = vi.fn();
    (player._class as any).observable.subscribe(subscriber);

    load(
      player,
      {
        _class: {
          id: "studio-default",
          name: "Studio Default Class",
        },
      },
      true,
    );

    expect(player._class()).toEqual({
      id: "studio-default",
      name: "Studio Default Class",
    });
    expect(subscriber).toHaveBeenLastCalledWith(
      expect.objectContaining({
        type: "add",
        key: "name",
        value: "Studio Default Class",
      }),
    );
  });

  test("loads hotbar arrays instead of assigning fields to the signal function", () => {
    const player = new RpgCommonPlayer();

    load(
      player,
      {
        hotbar: {
          initialized: true,
          slots: [{ type: "skill", id: "arcane-shot" }],
        },
      },
      true,
    );

    expect(player.hotbar().initialized).toBe(true);
    expect(player.hotbar().slots[0]).toEqual({
      type: "skill",
      id: "arcane-shot",
    });
    expect((player.hotbar as any).slots).toBeUndefined();
  });
});
