import { afterEach, describe, expect, test, vi } from "vitest";
import * as serverEntry from "./server-entry";
import { configureStudioBlockExecutors } from "./block-executor";

const makePlayer = () => {
  const map = {};
  return {
    id: "hero",
    gold: 10,
    getCurrentMap: () => map,
    getVariable: vi.fn(),
    setVariable: vi.fn(),
    syncChanges: vi.fn(),
  };
};

afterEach(() => configureStudioBlockExecutors(undefined));

describe("createStudioBlockRunner", () => {
  test("is exported from the server entry", () => {
    expect(typeof serverEntry.createStudioBlockRunner).toBe("function");
  });

  test("run() executes one block for the player", async () => {
    const player = makePlayer();
    const runner = serverEntry.createStudioBlockRunner(player as any, null, player.getCurrentMap() as any, { variableScope: "player" });
    await runner.run("change_gold", { type: "constant", operation: "add", amount: 10 } as any);
    expect(player.gold).toBe(20);
  });

  test("run() uses the executors of the game", async () => {
    const custom = vi.fn();
    configureStudioBlockExecutors({ my_block: custom } as any);
    const player = makePlayer();
    const runner = serverEntry.createStudioBlockRunner(player as any, null, player.getCurrentMap() as any);
    await runner.run("my_block" as any, { value: 1 } as any);
    expect(custom).toHaveBeenCalledWith(expect.objectContaining({ player }), { value: 1 });
  });

  test("run() rejects for an unknown block type", async () => {
    const player = makePlayer();
    const runner = serverEntry.createStudioBlockRunner(player as any, null, player.getCurrentMap() as any);
    await expect(runner.run("nope_block" as any, {} as any)).rejects.toThrow(/nope_block/);
    await expect(runner.run("constructor" as any, {} as any)).rejects.toThrow(/constructor/);
  });

  test("run() rejects when the executor throws", async () => {
    configureStudioBlockExecutors({ boom: async () => { throw new Error("boom!"); } } as any);
    const player = makePlayer();
    const runner = serverEntry.createStudioBlockRunner(player as any, null, player.getCurrentMap() as any);
    await expect(runner.run("boom" as any, {} as any)).rejects.toThrow("boom!");
  });
});
