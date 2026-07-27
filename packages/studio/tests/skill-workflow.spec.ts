import { describe, expect, test, vi } from "vitest";
import { createStudioSkillOnUse } from "../src/skill-workflow";

const workflow = (phase: "cast" | "impact" | "defeat", variableId: string) => ({
  phase,
  blockCollectionId: `${phase}-workflow`,
  blocks: [{
      id: `set-${variableId}`,
      type: "set_variable",
      data: {
        variableId,
        operation: "set",
        value: 1,
      },
    }],
});

const commonEvent = (variableId: string) => ({
  triggers: [{
    type: "onAction",
    enabled: true,
    blocks: workflow("impact", variableId).blocks,
  }],
});

describe("Studio skill workflows", () => {
  test("runs cast, impact and defeat workflows from the native onUse hook", async () => {
    const variables = new Map<string, unknown>();
    const map = {};
    const player = {
      id: "hero",
      getCurrentMap: () => map,
      getVariable: (id: string) => variables.get(id),
      setVariable: (id: string, value: unknown) => variables.set(id, value),
      syncChanges: vi.fn(),
    };
    const target = {
      id: "slime",
      hp: 0,
      isEvent: () => true,
      getCurrentMap: () => map,
    };
    const defaultEffect = vi.fn(() => [{ defeated: true }]);
    const onUse = createStudioSkillOnUse("fire", [
      workflow("cast", "cast"),
      workflow("impact", "impact"),
      workflow("defeat", "defeat"),
    ]);

    await onUse?.(player as any, target, {
      action: { mode: "melee" },
      defaultEffect,
      projectile: vi.fn(),
    });

    expect(defaultEffect).toHaveBeenCalledOnce();
    expect(Object.fromEntries(variables)).toEqual({
      cast: 1,
      impact: 1,
      defeat: 1,
    });
  });

  test("keeps projectile damage deferred until impact", async () => {
    const map = {};
    const variables = new Map<string, unknown>();
    const player = {
      id: "hero",
      getCurrentMap: () => map,
      getVariable: (id: string) => variables.get(id),
      setVariable: (id: string, value: unknown) => variables.set(id, value),
      syncChanges: vi.fn(),
    };
    const target = { id: "slime", hp: 5, isEvent: () => true };
    const defaultEffect = vi.fn(() => [{ defeated: false }]);
    let projectileOptions: Record<string, unknown> | undefined;
    const onUse = createStudioSkillOnUse("fireball", [
      workflow("impact", "impact"),
    ]);

    await onUse?.(player as any, target, {
      action: {
        mode: "projectile",
        projectile: { speed: 240 },
      },
      defaultEffect,
      projectile: (options) => {
        projectileOptions = options;
      },
    });

    expect(defaultEffect).not.toHaveBeenCalled();
    expect(projectileOptions).toMatchObject({ speed: 240 });

    const onImpact = projectileOptions?.["onImpact"];
    expect(onImpact).toBeTypeOf("function");
    (onImpact as Function)({ target }, { defaultEffect });
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(defaultEffect).toHaveBeenCalledWith(target);
    expect(variables.get("impact")).toBe(1);
  });

  test("keeps compatibility with Common Event workflow references", async () => {
    const variables = new Map<string, unknown>();
    const map = {
      __studioCommonEventsById: new Map([
        ["legacy-impact-event", commonEvent("legacy-impact")],
      ]),
    };
    const player = {
      id: "hero",
      getCurrentMap: () => map,
      getVariable: (id: string) => variables.get(id),
      setVariable: (id: string, value: unknown) => variables.set(id, value),
      syncChanges: vi.fn(),
    };
    const target = { id: "slime", hp: 5, isEvent: () => true };
    const onUse = createStudioSkillOnUse("legacy-fire", [{
      phase: "impact",
      commonEventId: "legacy-impact-event",
    }]);

    await onUse?.(player as any, target, {
      action: { mode: "melee" },
      defaultEffect: () => [{ defeated: false }],
      projectile: vi.fn(),
    });

    expect(variables.get("legacy-impact")).toBe(1);
  });
});
