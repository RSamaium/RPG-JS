import { describe, expect, test, vi } from "vitest";
import { RpgPlayer } from "@rpgjs/server";
import { openActionBattleActionBar } from "./server";

describe("action battle action bar", () => {
  test("sends the configured mode and clamped slot count to the client", () => {
    const player = new RpgPlayer();
    const emit = vi.spyOn(player, "emit");

    openActionBattleActionBar(player, {
      ui: {
        actionBar: {
          enabled: true,
          mode: "skills",
          slotCount: 12,
        },
      },
    });

    expect(emit).toHaveBeenCalledWith("gui.open", expect.objectContaining({
      guiId: "action-battle-action-bar",
      data: expect.objectContaining({
        mode: "skills",
        slotCount: 10,
      }),
    }));
  });

  test("keeps configured assignments ordered and refreshes with the latest slots", async () => {
    const player = new RpgPlayer();
    (player as any).skills = () => [{
      id: () => "fire",
      name: () => "Fire",
      description: () => "Fire spell",
      spCost: () => 2,
    }];
    const emit = vi.spyOn(player, "emit");

    openActionBattleActionBar(player, {
      ui: {
        actionBar: {
          enabled: true,
          slotCount: 3,
          slots: [{ type: "skill", id: "fire" }, null, null],
        },
      },
    });
    openActionBattleActionBar(player, {
      ui: {
        actionBar: {
          enabled: true,
          slotCount: 3,
          slots: [null, null, { type: "skill", id: "fire" }],
        },
      },
    });

    await player.getGui("action-battle-action-bar")?.emit("refresh", {});

    expect(emit).toHaveBeenLastCalledWith("gui.update", expect.objectContaining({
      data: expect.objectContaining({
        slots: [
          expect.objectContaining({ type: "empty" }),
          expect.objectContaining({ type: "empty" }),
          expect.objectContaining({
            type: "skill",
            skill: expect.objectContaining({ id: "fire", name: "Fire" }),
          }),
        ],
      }),
    }));
  });

  test("delegates the menu request to the latest runtime callback", async () => {
    const player = new RpgPlayer();
    const firstCallback = vi.fn();
    const latestCallback = vi.fn();

    openActionBattleActionBar(player, {
      ui: { actionBar: { enabled: true, onOpenMenu: firstCallback } },
    });
    openActionBattleActionBar(player, {
      ui: { actionBar: { enabled: true, onOpenMenu: latestCallback } },
    });

    await player.getGui("action-battle-action-bar")?.emit("openMenu", {});

    expect(firstCallback).not.toHaveBeenCalled();
    expect(latestCallback).toHaveBeenCalledOnce();
  });
});
