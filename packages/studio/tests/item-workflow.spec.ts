import { describe, expect, test, vi } from "vitest";
import {
  createStudioItemWorkflowHooks,
  normalizeStudioItemWorkflowTriggers,
  type StudioItemWorkflowPhase,
} from "../src/item-workflow";

const workflow = (
  phase: StudioItemWorkflowPhase,
  blocks: Array<Record<string, unknown>>,
) => ({
  phase,
  blockCollectionId: `${phase}-workflow`,
  blocks,
});

const setVariable = (
  variableId: string,
  value: number,
  operation: "set" | "add" = "set",
) => ({
  id: `${operation}-${variableId}-${value}`,
  type: "set_variable",
  data: {
    variableId,
    operation,
    value,
  },
});

const createPlayer = () => {
  const variables = new Map<string, unknown>();
  const player = {
    id: "hero",
    getCurrentMap: () => ({}),
    getVariable: (id: string) => variables.get(id),
    setVariable: (id: string, value: unknown) => variables.set(id, value),
    syncChanges: vi.fn(),
  };
  return { player, variables };
};

describe("Studio item workflows", () => {
  test("normalizes only supported lifecycle hooks with valid references", () => {
    expect(normalizeStudioItemWorkflowTriggers([
      { phase: "onUse", blockCollectionId: " use-workflow " },
      { phase: "onEquip", commonEventId: "equip-event" },
      { phase: "cast", blockCollectionId: "skill-workflow" },
      { phase: "onAdd", blockCollectionId: "" },
    ])).toEqual([
      { phase: "onUse", blockCollectionId: "use-workflow" },
      { phase: "onEquip", commonEventId: "equip-event" },
    ]);
  });

  test("queues native lifecycle hooks in invocation order", async () => {
    const { player, variables } = createPlayer();
    const hooks = createStudioItemWorkflowHooks("potion", [
      workflow("onUse", [setVariable("lifecycle", 1)]),
      workflow("onRemove", [setVariable("lifecycle", 1, "add")]),
    ]);

    const onUse = hooks.onUse?.(player as any);
    const onRemove = hooks.onRemove?.(player as any);
    await Promise.all([onUse, onRemove]);

    expect(variables.get("lifecycle")).toBe(2);
    expect(player.syncChanges).toHaveBeenCalledTimes(2);
  });

  test("exposes the onEquip boolean to custom workflow conditions", async () => {
    const { player, variables } = createPlayer();
    const hooks = createStudioItemWorkflowHooks("iron-sword", [
      workflow("onEquip", [{
        id: "when-equipped",
        type: "conditional_branch",
        data: {
          conditionType: "custom",
          condition: "variables.equip === true",
          children: [setVariable("equipped-workflow", 1)],
        },
      }]),
    ]);

    await hooks.onEquip?.(player as any, true);
    expect(variables.get("equipped-workflow")).toBe(1);

    variables.set("equipped-workflow", 0);
    await hooks.onEquip?.(player as any, false);
    expect(variables.get("equipped-workflow")).toBe(0);
  });
});
