import { afterEach, describe, expect, test, vi } from "vitest";
import { ACTION_BATTLE_CLIENT_VISUAL_ID } from "./visual";
import {
  ACTION_BATTLE_SKILL_USE,
  createActionBattleServer,
} from "./server";

describe("action battle player visuals", () => {
  test.each([48, 200])("instant zero-range skills use nearby soft targets, not distant enemies (%i px)", (distance) => {
    const onUse = vi.fn();
    const skill = { id: "ice", _type: "skill", spCost: 10, hitRate: 1,
      animation: "ice-impact", targeting: { range: 0, aoeMask: ["#"] },
      action: { mode: "instant", target: "enemy" }, onUse };
    const enemy = { id: "dragon", hp: 100, battleAi: {}, x: () => distance, y: () => 0,
      hitbox: () => ({ w: 32, h: 32 }) };
    const map = { getEvents: () => [enemy], getPlayers: () => [], clientVisual: vi.fn() };
    const player = { id: "hero", sp: 100, x: () => 0, y: () => 0,
      hitbox: () => ({ w: 32, h: 32 }), getDirection: () => "right",
      skills: () => [{ id: "ice" }], getSkill: () => skill, databaseById: () => skill,
      hasEffect: () => false, getCurrentMap: () => map, getGui: () => null };
    const server = createActionBattleServer();
    (server.player?.onInput as any)(player, { action: ACTION_BATTLE_SKILL_USE, data: { id: "ice" } });
    expect(onUse).toHaveBeenCalledTimes(1);
    expect(onUse.mock.calls[0][1]).toEqual(distance === 48 ? [enemy] : null);
    onUse.mockClear();
    (server.player?.onInput as any)(player, {
      action: ACTION_BATTLE_SKILL_USE,
      data: { id: "ice", target: { x: 2, y: 0 } },
    });
    expect(onUse).not.toHaveBeenCalled();
  });

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

  test("validates learned skills and cooldowns on the server", () => {
    vi.useFakeTimers();
    const onUse = vi.fn();
    const skill = {
      id: "focus",
      _type: "skill",
      name: "Focus",
      spCost: 4,
      hitRate: 1,
      key: "1",
      targeting: { range: 0 },
      action: {
        mode: "instant",
        target: "self",
        cooldownMs: 350,
      },
      onUse,
    };
    const player = {
      id: "hero",
      sp: 10,
      skills: () => [{ id: "focus" }],
      getSkill: (id: string) => id === skill.id ? skill : null,
      databaseById: (id: string) => id === skill.id ? skill : null,
      hasEffect: () => false,
      clientVisual: vi.fn(),
      getGui: () => null,
      getCurrentMap: () => null,
    };
    const server = createActionBattleServer();
    const useSkill = () =>
      (server.player?.onInput as any)(player, {
        action: ACTION_BATTLE_SKILL_USE,
        data: { id: "focus" },
      });

    useSkill();
    useSkill();

    expect(onUse).toHaveBeenCalledTimes(1);
    expect(player.sp).toBe(6);

    vi.advanceTimersByTime(350);
    useSkill();

    expect(onUse).toHaveBeenCalledTimes(2);
    expect(player.sp).toBe(2);

    (server.player?.onInput as any)(player, {
      action: ACTION_BATTLE_SKILL_USE,
      data: { id: "unknown" },
    });
    expect(onUse).toHaveBeenCalledTimes(2);
  });

  test("opens or hides the hotbar from the per-player resolver on map changes", () => {
    const player = {
      initializeHotbar: vi.fn(),
      showHotbar: vi.fn(),
      hideHotbar: vi.fn(),
      enabled: true,
    };
    const server = createActionBattleServer({
      ui: {
        hotbar: {
          enabled: current => (current as any).enabled,
          autoOpen: true,
          capacity: () => 6,
          allowedEntryTypes: ["item"],
        },
      },
    });

    (server.player?.onJoinMap as any)(player);
    expect(player.showHotbar).toHaveBeenCalledWith(expect.objectContaining({
      capacity: expect.any(Function),
      allowedEntryTypes: ["item"],
    }));

    player.enabled = false;
    (server.player?.onJoinMap as any)(player);
    expect(player.hideHotbar).toHaveBeenCalledTimes(1);
  });
});
