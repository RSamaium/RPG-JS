import { describe, expect, it, vi } from "vitest";
import { RpgClientEngine } from "./RpgClientEngine";

function createEngine() {
  const handlers = new Map<string, (data?: any) => void>();
  const calls: Array<[string, ...unknown[]]> = [];
  const engine = Object.create(RpgClientEngine.prototype) as any;
  Object.assign(engine, {
    socketListenersInitialized: false,
    webSocket: {
      on: (event: string, callback: (data?: any) => void) => handlers.set(event, callback),
      emit: vi.fn(),
    },
    hooks: {
      callHooks: vi.fn((name: string, ...args: unknown[]) => {
        calls.push([name, ...args]);
        return { subscribe: vi.fn() };
      }),
    },
    stopPingPong: vi.fn(),
    localeConnected: true,
  });
  engine.initListeners();
  return { engine, handlers, calls };
}

describe("the disconnect hook of a client module", () => {
  it("runs `onDisconnect` (client-engine-onDisconnect) with the close reason and the socket", () => {
    const { engine, handlers, calls } = createEngine();
    handlers.get("close")!({ code: 4401, reason: "Authentication required" });
    expect(calls).toContainEqual(["client-engine-onDisconnect", engine, "Authentication required", engine.socket]);
    expect(engine.localeConnected).toBe(false);
    expect(engine.stopPingPong).toHaveBeenCalled();
  });

  it("gives an empty reason when the close has none", () => {
    const { handlers, calls } = createEngine();
    handlers.get("close")!(new Event("close"));
    expect(calls.find(([name]) => name === "client-engine-onDisconnect")?.[2]).toBe("");
  });

  it("still fires `client-engine-onDisconnected` for the modules that used that name", () => {
    const { engine, handlers, calls } = createEngine();
    handlers.get("close")!({ code: 1006 });
    expect(calls.map(([name]) => name)).toEqual(expect.arrayContaining(["client-engine-onDisconnect", "client-engine-onDisconnected"]));
    expect(calls).toContainEqual(["client-engine-onDisconnected", engine, engine.socket]);
  });
});
