import { describe, expect, test, vi } from "vitest";
import {
  activateActionBattleSkill,
  actionBattleTargetingOffset,
  resolveActionBattleSkillActivationMode,
} from "./skill-activation";

const skill = (overrides: Record<string, unknown> = {}) => ({
  id: "skill",
  name: "Skill",
  usable: true,
  ...overrides,
});

describe("action battle skill activation", () => {
  test("fires projectiles immediately so the server can soft-target", () => {
    expect(
      resolveActionBattleSkillActivationMode(
        skill({ range: 6, action: { mode: "projectile", target: "enemy" } }),
      ),
    ).toBe("immediate");
  });

  test("fires instant area skills directly and lets the server soft-target", () => {
    expect(
      resolveActionBattleSkillActivationMode(
        skill({
          range: 6,
          aoeMask: ["###", "###", "###"],
          action: { mode: "instant", target: "enemy" },
        }),
      ),
    ).toBe("immediate");
  });

  test("opens targeting for area and ally skills", () => {
    expect(
      resolveActionBattleSkillActivationMode(
        skill({ range: 4, aoeMask: ["###"], action: { mode: "melee" } }),
      ),
    ).toBe("targeting");
    expect(
      resolveActionBattleSkillActivationMode(
        skill({ action: { target: "ally" } }),
      ),
    ).toBe("targeting");
  });

  test("starts manual targeting one tile in front of the hero", () => {
    const use = vi.fn();
    const target = vi.fn();

    activateActionBattleSkill(
      skill({ range: 4, aoeMask: ["###"] }),
      { use, target, direction: "left" },
    );

    expect(use).not.toHaveBeenCalled();
    expect(target).toHaveBeenCalledWith({ x: -1, y: 0 });
    expect(actionBattleTargetingOffset("up", 4)).toEqual({ x: 0, y: -1 });
  });
});
