import { afterEach, describe, expect, it, vi } from "vitest";
import { createServer, provideServerModules } from "../src";
import type { RpgServerEngine } from "../src";
import { createRpgServerTransport, type RpgServerTransport } from "../src/node";

const wait = (ms = 0) => new Promise<void>((resolve) => setTimeout(resolve, ms));

describe("the engine.onStart hook of the server modules", () => {
  let transport: RpgServerTransport | undefined;

  afterEach(() => {
    vi.restoreAllMocks();
    transport = undefined;
  });

  const open = async (modules: Parameters<typeof provideServerModules>[0]) => {
    transport = createRpgServerTransport(createServer({ providers: [provideServerModules(modules)] }), { initializeMaps: false });
    const response = await transport.updateMap("start", { id: "start", width: 320, height: 240, events: [] });
    expect(response.ok).toBe(true);
    await wait();
    return transport;
  };

  it("is called with the engine when the server of a room starts", async () => {
    const onStart = vi.fn();

    const started = await open([{ engine: { onStart } }]);

    expect(onStart).toHaveBeenCalled();
    expect(onStart.mock.calls[0]?.[0]).toBe(started.getServer("map-start"));
  });

  it("is awaited: the server only goes on once the hook is done", async () => {
    const order: string[] = [];
    const modules = [{ engine: { onStart: async () => { await wait(10); order.push("hook"); } } }];

    await open(modules);
    order.push("started");

    expect(order[0]).toBe("hook");
  });

  it("does not stop the server when a hook fails: the error is logged", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const failure = new Error("bad hook");

    const started = await open([{ engine: { onStart: () => { throw failure; } } }]);

    expect(log).toHaveBeenCalledWith(expect.stringContaining("engine onStart"), failure);
    expect(started.getServer("map-start")).toBeDefined();
  });
});
