import { describe, expect, test, vi } from "vitest";
import {
  ACTION_BATTLE_CLIENT_VISUAL_ID,
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
      animations: {
        attack: () => "attack",
      },
      result: {
        damage: 7,
        defeated: false,
        attacker,
        target,
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
        }),
      })
    );
    const payload = clientVisual.mock.calls[0][1];
    expect(payload).not.toHaveProperty("animations");
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
