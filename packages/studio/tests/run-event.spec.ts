import { describe, expect, test, vi } from "vitest";
import { runStudioEvent } from "../src/run-event";
import { configureStudioBlockExecutors } from "../src/block-executor";

const createPlayer = (commonEvents: Record<string, unknown>) => {
  const variables = new Map<string, unknown>();
  const map = { __studioCommonEventsById: new Map(Object.entries(commonEvents)) };
  const player = {
    id: "hero",
    getCurrentMap: () => map,
    getVariable: (id: string) => variables.get(id),
    setVariable: (id: string, value: unknown) => variables.set(id, value),
    syncChanges: vi.fn(),
  };
  return { player, variables };
};

const eventWith = (blocks: unknown[]) => ({
  triggers: [{ type: "onAction", enabled: true, blocks }],
});

describe("runStudioEvent", () => {
  test("gives the variables to the event", async () => {
    const { player, variables } = createPlayer({
      "after-battle": eventWith([{
        id: "check",
        type: "conditional_branch",
        data: {
          conditionType: "custom",
          condition: "variables.damage === 12",
          children: [{
            id: "set",
            type: "set_variable",
            data: { variableId: "seen", operation: "set", value: 1 },
          }],
        },
      }]),
    });

    await runStudioEvent(player as any, "after-battle", { damage: 12 });

    expect(variables.get("seen")).toBe(1);
  });

  test("resolves without throwing for an unknown event", async () => {
    const { player } = createPlayer({});
    await expect(runStudioEvent(player as any, "missing")).resolves.toBeUndefined();
  });

  test("runs the block executors given by the game", async () => {
    const custom = vi.fn();
    configureStudioBlockExecutors({ call_battle: custom });
    try {
      const { player } = createPlayer({
        battle: eventWith([{ id: "b", type: "call_battle", data: { troopId: "t1" } }]),
      });
      await runStudioEvent(player as any, "battle");
      expect(custom).toHaveBeenCalledWith(expect.anything(), { troopId: "t1" });
    } finally {
      configureStudioBlockExecutors(undefined);
    }
  });
});
