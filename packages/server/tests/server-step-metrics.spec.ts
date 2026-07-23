import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createServer, provideServerModules } from "../src";
import type {
  RpgServerEngine,
  RpgServerStepMetrics,
} from "../src";
import {
  createRpgServerTransport,
  type RpgServerTransport,
} from "../src/node";

function wait(ms = 0): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

class MockWebSocket {
  readyState = 1;
  sent: string[] = [];
  private handlers = new Map<string, Array<(...args: any[]) => void>>();

  send(data: string): void {
    this.sent.push(data);
  }

  close(): void {
    this.readyState = 3;
    this.emit("close");
  }

  on(event: string, callback: (...args: any[]) => void): void {
    const listeners = this.handlers.get(event) || [];
    listeners.push(callback);
    this.handlers.set(event, listeners);
  }

  emit(event: string, ...args: any[]): void {
    for (const callback of this.handlers.get(event) || []) {
      callback(...args);
    }
  }
}

describe("server step metrics", () => {
  let transport: RpgServerTransport;
  let map: any;
  let socket: MockWebSocket | undefined;
  let onStep: ReturnType<typeof vi.fn>;
  let legacyOnStep: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    onStep = vi.fn();
    legacyOnStep = vi.fn();
    const GameServer = createServer({
      providers: [
        provideServerModules([
          {
            engine: {
              onStep(
                server: RpgServerEngine,
                metrics: RpgServerStepMetrics,
              ) {
                onStep(server, metrics);
              },
            },
          },
          {
            engine: {
              onStep(server: RpgServerEngine) {
                legacyOnStep(server);
              },
            },
          },
        ]),
      ],
    });
    transport = createRpgServerTransport(GameServer, {
      initializeMaps: false,
    });

    const response = await transport.updateMap("metrics", {
      id: "metrics",
      width: 320,
      height: 240,
      events: [],
    });
    expect(response.ok).toBe(true);
    map = transport.getServer("map-metrics")!.getCurrentRoom<any>();
  });

  afterEach(async () => {
    socket?.close();
    map?.setAutoTick(false);
    await wait();
    vi.restoreAllMocks();
  });

  async function connectPlayer(): Promise<void> {
    socket = new MockWebSocket();
    expect(await transport.acceptWebSocket(socket as any, {
      url: "http://localhost/parties/main/map-metrics?id=metrics-player",
      method: "GET",
      headers: {
        host: "localhost",
      },
    })).toBe(true);
    await wait(10);
  }

  it("emits typed metrics from the automatic map tick loop", async () => {
    await connectPlayer();

    await vi.waitFor(() => {
      expect(onStep).toHaveBeenCalled();
    }, { timeout: 500 });

    const [server, metrics] = onStep.mock.calls.at(-1)!;
    expect(server).toBe(transport.getServer("map-metrics"));
    expect(metrics).toEqual({
      tick: expect.any(Number),
      durationMs: expect.any(Number),
      scheduledDeltaMs: expect.any(Number),
      queuedDeltaMs: expect.any(Number),
      fixedSteps: expect.any(Number),
      pendingInputs: expect.any(Number),
    });
    expect(metrics.durationMs).toBeGreaterThanOrEqual(0);
    expect(metrics.scheduledDeltaMs).toBeGreaterThan(0);
    expect(metrics.tick).toBeGreaterThan(0);
    expect(metrics.tick).toBeLessThanOrEqual(map.getTick());
    expect(legacyOnStep).toHaveBeenCalledWith(server);
  });

  it("reports queued delta and pending inputs until delayed processing recovers", async () => {
    await connectPlayer();
    map.setAutoTick(false);
    onStep.mockClear();

    const player = map.getPlayers()[0];
    player.pendingInputs = [{ frame: 1 }];
    let releaseFirstTick!: () => void;
    const firstTickGate = new Promise<void>((resolve) => {
      releaseFirstTick = resolve;
    });
    const runServerTick = vi.spyOn(map, "runServerTick");
    runServerTick
      .mockImplementationOnce(async () => {
        await firstTickGate;
        return 1;
      })
      .mockImplementationOnce(async () => {
        player.pendingInputs = [];
        return 1;
      });

    const processing = map.runQueuedServerTick(17);
    await wait();
    await map.runQueuedServerTick(23);
    releaseFirstTick();
    await processing;

    expect(onStep).toHaveBeenCalledTimes(2);
    expect(onStep.mock.calls[0][1]).toMatchObject({
      scheduledDeltaMs: 17,
      queuedDeltaMs: 23,
      fixedSteps: 1,
      pendingInputs: 1,
    });
    expect(onStep.mock.calls[1][1]).toMatchObject({
      scheduledDeltaMs: 23,
      queuedDeltaMs: 0,
      fixedSteps: 1,
      pendingInputs: 0,
    });
  });

  it("does not emit step hooks while an empty map loop is stopped", async () => {
    expect(Array.from(
      transport.getRoom("map-metrics")!.getConnections(),
    )).toHaveLength(0);
    expect(map.tickSubscription).toBeFalsy();

    await wait(40);

    expect(onStep).not.toHaveBeenCalled();
  });

  it("stops emitting after the last player disconnects", async () => {
    await connectPlayer();
    await vi.waitFor(() => {
      expect(onStep).toHaveBeenCalled();
    }, { timeout: 500 });

    socket!.close();
    await vi.waitFor(() => {
      expect(map.tickSubscription).toBeFalsy();
    }, { timeout: 500 });
    onStep.mockClear();
    await wait(40);

    expect(onStep).not.toHaveBeenCalled();
  });
});
