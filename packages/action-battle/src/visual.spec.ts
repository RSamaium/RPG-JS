import { describe, expect, test, vi } from "vitest";
import {
  ACTION_BATTLE_CLIENT_VISUAL_ID,
  ACTION_BATTLE_DAMAGE_COMPONENT_ID,
  ACTION_BATTLE_HIT_FX_COMPONENT_ID,
  createActionBattleVisual,
  createActionBattleClientVisuals,
  emitActionBattleClientVisual,
  usesActionBattleFxVisual,
} from "./visual";
import { setActionBattleOptions } from "./config";

const createEntity = () => ({
  flash: vi.fn(),
  showHit: vi.fn(),
  showComponentAnimation: vi.fn(),
  setGraphicAnimation: vi.fn(),
});

describe("action battle visual composer", () => {
  test("classic hit uses the low-level flash and damage text primitives", () => {
    const target = createEntity();
    const visual = createActionBattleVisual("classic");

    visual({
      moment: "hit",
      target,
      damage: 12,
    });

    expect(target.flash).toHaveBeenCalledWith({
      type: "tint",
      tint: "red",
      duration: 200,
      cycles: 1,
    });
    expect(target.showHit).toHaveBeenCalledWith("-12");
  });

  test("classic hit falls back to component animation when client objects have no showHit helper", () => {
    const target = {
      flash: vi.fn(),
      showComponentAnimation: vi.fn(),
    };
    const visual = createActionBattleVisual("classic");

    visual({
      moment: "hit",
      target,
      damage: 12,
    });

    expect(target.flash).toHaveBeenCalledWith({
      type: "tint",
      tint: "red",
      duration: 200,
      cycles: 1,
    });
    expect(target.showComponentAnimation).toHaveBeenCalledWith("hit", {
      text: "-12",
      direction: undefined,
    });
  });

  test("fx hit keeps classic feedback and adds a CanvasEngine Fx component animation", () => {
    const target = createEntity();
    const visual = createActionBattleVisual("fx");

    visual({
      moment: "hit",
      target,
      damage: 9,
    });

    expect(target.showHit).toHaveBeenCalledWith("-9");
    expect(target.showComponentAnimation).toHaveBeenCalledWith(
      ACTION_BATTLE_HIT_FX_COMPONENT_ID,
      expect.objectContaining({
        name: "hitSpark",
      })
    );
    expect(usesActionBattleFxVisual(visual)).toBe(true);
  });

  test("impact uses a charged damage popup and impact burst without duplicating classic hit text", () => {
    const target = createEntity();
    const visual = createActionBattleVisual("impact");

    visual({
      moment: "hurt",
      target,
      damage: 42,
      result: {
        damage: 42,
        metadata: { charged: true },
      },
    });

    expect(target.showHit).not.toHaveBeenCalled();
    expect(target.showComponentAnimation).toHaveBeenCalledWith(
      ACTION_BATTLE_DAMAGE_COMPONENT_ID,
      expect.objectContaining({
        amount: 42,
        kind: "charged",
      })
    );
    expect(target.showComponentAnimation).toHaveBeenCalledWith(
      ACTION_BATTLE_HIT_FX_COMPONENT_ID,
      expect.objectContaining({
        name: "impactBurst",
        scale: 1.3,
      })
    );
  });

  test("impact lets a skill customize its typography and CanvasEngine preset", () => {
    const target = createEntity();
    const visual = createActionBattleVisual("impact");

    visual({
      moment: "hurt",
      target,
      damage: 24,
      skill: { id: "fire", name: "Fire" },
      result: {
        damage: 24,
        metadata: {
          visual: {
            fx: "magicBurst",
            color: "#ffd166",
            accentColor: "#a62c21",
            scale: 1.2,
          },
        },
      },
    });

    expect(target.showComponentAnimation).toHaveBeenCalledWith(
      ACTION_BATTLE_DAMAGE_COMPONENT_ID,
      expect.objectContaining({
        amount: 24,
        kind: "skill",
        caption: "Fire",
        color: "#ffd166",
        accentColor: "#a62c21",
      })
    );
    expect(target.showComponentAnimation).toHaveBeenCalledWith(
      ACTION_BATTLE_HIT_FX_COMPONENT_ID,
      expect.objectContaining({
        name: "magicBurst",
        scale: 1.2,
      })
    );
  });

  test("impact gives healing skills a green popup and heal pulse", () => {
    const target = createEntity();
    const visual = createActionBattleVisual("impact");

    visual({
      moment: "heal",
      target,
      damage: 30,
      skill: { id: "heal-wave", name: "Heal Wave" },
      result: {
        damage: 30,
        metadata: { healing: true },
      },
    });

    expect(target.showComponentAnimation).toHaveBeenCalledWith(
      ACTION_BATTLE_DAMAGE_COMPONENT_ID,
      expect.objectContaining({
        amount: 30,
        kind: "heal",
      })
    );
    expect(target.showComponentAnimation).toHaveBeenCalledWith(
      ACTION_BATTLE_HIT_FX_COMPONENT_ID,
      expect.objectContaining({
        name: "healPulse",
      })
    );
  });

  test("custom composer parts receive helpers", () => {
    const target = createEntity();
    const visual = createActionBattleVisual({
      hit({ target }, fx) {
        fx.component(target, "custom-hit", { name: "impactBurst" });
      },
    });

    visual({
      moment: "hit",
      target,
      damage: 3,
    });

    expect(target.showComponentAnimation).toHaveBeenCalledWith("custom-hit", {
      name: "impactBurst",
    });
  });

  test("server visual emission sends one action-battle client visual packet", () => {
    setActionBattleOptions({ visual: "classic" } as any);
    const clientVisual = vi.fn();
    const attacker = {
      id: "player-1",
      getCurrentMap: () => ({ clientVisual }),
    };
    const target = {
      id: "enemy-1",
    };

    emitActionBattleClientVisual({
      moment: "hit",
      entity: attacker,
      target,
      damage: 7,
      skill: { id: "fire", name: "Fire" },
      animations: {
        attack: () => "attack",
      },
      result: {
        damage: 7,
        defeated: false,
        attacker,
        target,
        metadata: {
          visual: {
            fx: "magicBurst",
            color: "#ffd166",
          },
        },
      },
    });

    expect(clientVisual).toHaveBeenCalledWith(
      ACTION_BATTLE_CLIENT_VISUAL_ID,
      expect.objectContaining({
        moment: "hit",
        objectId: "player-1",
        sourceId: "player-1",
        targetId: "enemy-1",
        damage: 7,
        result: expect.objectContaining({
          damage: 7,
          defeated: false,
          metadata: {
            visual: {
              fx: "magicBurst",
              color: "#ffd166",
            },
          },
        }),
        skill: { id: "fire", name: "Fire" },
      })
    );
    const payload = clientVisual.mock.calls[0][1];
    expect(payload.animations).toEqual({
      attack: "attack",
    });
    expect(() => structuredClone(payload)).not.toThrow();
  });

  test("resolves entity-specific animation functions before client transfer", () => {
    setActionBattleOptions({ visual: "classic" } as any);
    const clientVisual = vi.fn();
    const enemy = {
      id: "enemy-1",
      studioCombatAnimations: {
        attack: "studio-attack-media",
      },
      getCurrentMap: () => ({ clientVisual }),
    };

    emitActionBattleClientVisual({
      moment: "attack",
      entity: enemy,
      animations: {
        attack: (entity) => ({
          animationName: "attack",
          graphic: entity.studioCombatAnimations.attack,
          repeat: 1,
        }),
      },
    });

    const payload = clientVisual.mock.calls[0][1];
    expect(payload.animations).toEqual({
      attack: {
        animationName: "attack",
        graphic: "studio-attack-media",
        repeat: 1,
      },
    });
    expect(() => structuredClone(payload)).not.toThrow();
  });

  test("client visual handler replays configured action-battle visual locally", () => {
    const target = createEntity();
    const visuals = createActionBattleClientVisuals({
      visual: "fx",
      animations: {},
    } as any);

    visuals[ACTION_BATTLE_CLIENT_VISUAL_ID]({
      target,
      data: {
        moment: "hit",
        damage: 11,
      },
    });

    expect(target.showHit).toHaveBeenCalledWith("-11");
    expect(target.showComponentAnimation).toHaveBeenCalledWith(
      ACTION_BATTLE_HIT_FX_COMPONENT_ID,
      expect.objectContaining({
        name: "hitSpark",
      })
    );
  });

  test("impact feedback applies a short render-only hit-stop", () => {
    vi.useFakeTimers();
    const target = createEntity();
    let paused = false;
    const visualPause = Object.assign(() => paused, {
      set(value: boolean) {
        paused = value;
      },
    });
    const visuals = createActionBattleClientVisuals({
      visual: "impact",
      animations: {},
      feedback: {
        hitStop: true,
        hitStopMs: 30,
      },
    } as any);

    visuals[ACTION_BATTLE_CLIENT_VISUAL_ID]({
      engine: { visualPause },
      target,
      data: {
        moment: "hit",
        damage: 11,
      },
    });

    expect(paused).toBe(true);
    vi.advanceTimersByTime(30);
    expect(paused).toBe(false);
    vi.useRealTimers();
  });

  test("feedback accessibility options suppress flash, shake, and damage labels", () => {
    const target = createEntity();
    const shake = vi.fn();
    const visuals = createActionBattleClientVisuals({
      visual: "impact",
      animations: {},
      feedback: {
        hitStop: false,
        flashes: false,
        screenShake: false,
        damageNumbers: false,
      },
    } as any);

    visuals[ACTION_BATTLE_CLIENT_VISUAL_ID](
      {
        target,
        data: {
          moment: "hit",
          damage: 11,
        },
      },
      { shake }
    );

    expect(target.flash).not.toHaveBeenCalled();
    expect(shake).not.toHaveBeenCalled();
    expect(target.showHit).not.toHaveBeenCalled();
    expect(target.showComponentAnimation).not.toHaveBeenCalledWith(
      ACTION_BATTLE_DAMAGE_COMPONENT_ID,
      expect.anything()
    );
    expect(target.showComponentAnimation).toHaveBeenCalledWith(
      ACTION_BATTLE_HIT_FX_COMPONENT_ID,
      expect.anything()
    );
  });

  test("client custom visual parts can use sound and camera shake helpers", () => {
    const sound = vi.fn();
    const shake = vi.fn();
    const visual = createActionBattleVisual({
      hit(_context, fx) {
        fx.sound("heavy-hit", { volume: 0.8 });
        fx.shake({ intensity: 5 });
      },
    });
    const visuals = createActionBattleClientVisuals({ visual } as any);

    visuals[ACTION_BATTLE_CLIENT_VISUAL_ID](
      {
        data: { moment: "hit" },
      },
      { sound, shake }
    );

    expect(sound).toHaveBeenCalledWith("heavy-hit", { volume: 0.8 });
    expect(shake).toHaveBeenCalledWith({ intensity: 5 });
  });

  test("routes generic AI visuals by kind and ignores unknown kinds", () => {
    const rage = vi.fn();
    const helpers = { flash: vi.fn() };
    const object = createEntity();
    const visuals = createActionBattleClientVisuals({
      ai: {
        visuals: {
          rage,
        },
      },
    } as any);
    const play = visuals[ACTION_BATTLE_CLIENT_VISUAL_ID];

    play(
      {
        object,
        data: {
          moment: "ai",
          visual: { kind: "rage", durationMs: 600 },
        },
      },
      helpers
    );
    play(
      {
        object,
        data: {
          moment: "ai",
          visual: { kind: "not-registered" },
        },
      },
      helpers
    );

    expect(rage).toHaveBeenCalledTimes(1);
    expect(rage).toHaveBeenCalledWith(
      expect.objectContaining({
        object,
        visual: { kind: "rage", durationMs: 600 },
      }),
      helpers
    );
  });
});
