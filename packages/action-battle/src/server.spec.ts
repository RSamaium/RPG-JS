import { afterEach, describe, expect, test, vi } from "vitest";
import { ACTION_BATTLE_CLIENT_VISUAL_ID } from "./visual";
import { createActionBattleServer } from "./server";

describe("action battle player visuals", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  test("resolves configured player attack animations on the server", () => {
    vi.useFakeTimers();
    const clientVisual = vi.fn();
    const map = {
      clientVisual,
      getEvents: () => [],
      getPlayers: () => [],
      queryHitbox: () => [],
      stopMovement: vi.fn(),
    };
    const player = {
      id: "hero",
      canMove: true,
      directionFixed: false,
      animationFixed: false,
      pendingInputs: [],
      lastProcessedInputTs: 0,
      studioCombatAnimations: {
        attack: "studio-hero-attack",
      },
      x: () => 100,
      y: () => 120,
      hitbox: () => ({ w: 32, h: 32 }),
      getDirection: () => "down",
      changeDirection: vi.fn(),
      getCurrentMap: () => map,
      equipments: () => [],
      setGraphicAnimation: vi.fn(),
    };
    const server = createActionBattleServer({
      attack: {
        profile: {
          activeMs: 1,
          recoveryMs: 0,
          control: {
            movementLock: "none",
            directionLock: "none",
          },
        },
      },
      animations: {
        attack(entity) {
          return {
            animationName: "attack",
            graphic: entity.studioCombatAnimations.attack,
            repeat: 1,
          };
        },
      },
    });

    (server.player?.onInput as any)(player, {
      action: "action",
      data: { direction: "down" },
    });

    expect(clientVisual).toHaveBeenCalledWith(
      ACTION_BATTLE_CLIENT_VISUAL_ID,
      expect.objectContaining({
        moment: "attack",
        objectId: "hero",
        animations: {
          attack: {
            animationName: "attack",
            graphic: "studio-hero-attack",
            repeat: 1,
          },
        },
      })
    );

    vi.runAllTimers();

    expect(player.animationFixed).toBe(false);
    expect(player.setGraphicAnimation).not.toHaveBeenCalledWith("stand");
  });
});
