import { afterEach, expect, test, vi } from "vitest";
import { defineModule, TIME_MANAGER_SYNC_KEY, withTimeManager } from "@rpgjs/common";
import { testing } from "@rpgjs/testing";
import { inject as diInject } from "@signe/di";
import { ClientTimeManager, RpgClient } from "../../client/src";
import { RpgPlayer, RpgServer, TimeManager, inject as injectServer } from "../src";

const serverModule = defineModule<RpgServer>({
  maps: [
    {
      id: "map1",
      file: "",
    },
    {
      id: "map2",
      file: "",
    },
  ],
  player: {
    async onConnected(player: RpgPlayer) {
      await player.changeMap("map1", { x: 100, y: 100 });
    },
  },
});

const clientModule = defineModule<RpgClient>({});

let fixture: any;
const createRuntimeMap = (id: string) => ({
  id,
  $broadcast: vi.fn(),
  applySyncToClient: vi.fn(),
  $applySync: vi.fn(),
  setWeather: vi.fn(),
  clearWeather: vi.fn(),
  setLighting: vi.fn(),
  setSync(definitions: Record<string, { $initial: unknown }>) {
    for (const [key, definition] of Object.entries(definitions)) {
      let value = definition.$initial;
      const signal = (() => value) as (() => unknown) & { set: (next: unknown) => void };
      signal.set = (next: unknown) => {
        value = next;
      };
      (this as any)[key] = signal;
    }
  },
});

afterEach(() => {
  fixture?.clear();
  vi.useRealTimers();
});

test("withTimeManager syncs map time snapshots and lets the client infer current time", async () => {
  const module = withTimeManager({
    start: "0001-01-01 08:00",
    scale: 10,
    calendar: {
      months: 12,
      daysPerMonth: 30,
      daysPerWeek: 7,
      seasons: ["spring", "summer", "autumn", "winter"],
    },
  });

  fixture = await testing([
    module,
    {
      server: serverModule,
      client: clientModule,
    },
  ]);

  const client = await fixture.createClient();
  let player = await client.waitForMapChange("map1");
  await fixture.wait(0);
  await fixture.applySyncToClient();

  const serverTime = injectServer(TimeManager);
  const clientTime = diInject<ClientTimeManager>(client.client.context, ClientTimeManager);
  const map = player.getCurrentMap() as any;

  expect(map[TIME_MANAGER_SYNC_KEY]()).toMatchObject({
    scale: 10,
    paused: false,
  });
  expect(map[TIME_MANAGER_SYNC_KEY]().elapsedMinutes).toBeCloseTo(480, 0);
  expect(clientTime.state()).toMatchObject({
    year: 1,
    month: 1,
    day: 1,
    hour: 8,
    minute: 0,
    weekday: 0,
    season: "spring",
  });

  serverTime.set({ hour: 22, minute: 30 });
  await fixture.applySyncToClient();

  expect(clientTime.state()).toMatchObject({
    hour: 22,
    minute: 30,
  });

  serverTime.advance({ hours: 2 });
  await fixture.applySyncToClient();

  expect(clientTime.state()).toMatchObject({
    day: 2,
    hour: 0,
    minute: 30,
  });

  serverTime.pause();
  await fixture.applySyncToClient();
  const pausedState = clientTime.state(Date.now())!;
  const laterPausedState = clientTime.state(Date.now() + 60_000)!;
  expect(laterPausedState.elapsedMinutes).toBe(pausedState.elapsedMinutes);

  serverTime.resume();
  serverTime.setScale(30);
  await fixture.applySyncToClient();
  const projectedState = clientTime.state(Date.now() + 60_000)!;
  expect(Math.floor(projectedState.elapsedMinutes - clientTime.state()!.elapsedMinutes)).toBe(30);

  await player.changeMap("map2", { x: 10, y: 10 });
  player = await client.waitForMapChange("map2");
  await fixture.wait(0);
  await fixture.applySyncToClient();

  expect(player.getCurrentMap()?.id).toBe("map2");
  expect(clientTime.state()).toMatchObject({
    scale: 30,
  });
});

test("time manager applies initial lighting without broadcasting before map runtime is ready", () => {
  const timeManager = new TimeManager();
  timeManager.configure({
    start: "0001-01-01 07:00",
    lighting: {
      enabled: true,
      transitionMs: 900,
      phases: {
        dawn: {
          hour: 6,
          lighting: {
            ambient: { darkness: 0.2 },
            sun: { intensity: 0.6 },
          },
        },
      },
    },
  });

  const setLighting = vi.fn();
  const transitionLighting = vi.fn();
  const map = {
    setSync(definitions: Record<string, { $initial: unknown }>) {
      for (const [key, definition] of Object.entries(definitions)) {
        let value = definition.$initial;
        const signal = (() => value) as (() => unknown) & { set: (next: unknown) => void };
        signal.set = (next: unknown) => {
          value = next;
        };
        (this as any)[key] = signal;
      }
    },
    setLighting,
    transitionLighting,
  };

  expect(() => timeManager.registerMap(map as any)).not.toThrow();
  expect(transitionLighting).not.toHaveBeenCalled();
  expect(setLighting).toHaveBeenCalledWith(expect.any(Object), { sync: false });
});

test("time manager refreshes lighting when projected time crosses a phase", () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));

  try {
    const timeManager = new TimeManager();
    timeManager.configure({
      start: "0001-01-01 07:59",
      scale: 60,
      lighting: {
        enabled: true,
        phases: {
          dawn: {
            hour: 6,
            lighting: {
              ambient: { darkness: 0.2 },
            },
          },
          day: {
            hour: 8,
            lighting: {
              ambient: { darkness: 0 },
            },
          },
        },
      },
    });

    const setLighting = vi.fn();
    const map = {
      $broadcast: vi.fn(),
      applySyncToClient: vi.fn(),
      $applySync: vi.fn(),
      setSync(definitions: Record<string, { $initial: unknown }>) {
        for (const [key, definition] of Object.entries(definitions)) {
          let value = definition.$initial;
          const signal = (() => value) as (() => unknown) & { set: (next: unknown) => void };
          signal.set = (next: unknown) => {
            value = next;
          };
          (this as any)[key] = signal;
        }
      },
      setLighting,
    };

    timeManager.registerMap(map as any);
    expect(setLighting).toHaveBeenLastCalledWith(expect.objectContaining({
      ambient: expect.objectContaining({ darkness: 0.2 }),
    }), undefined);

    vi.advanceTimersByTime(1000);

    expect(setLighting).toHaveBeenLastCalledWith(expect.objectContaining({
      ambient: expect.objectContaining({ darkness: 0 }),
    }), undefined);
  } finally {
    vi.useRealTimers();
  }
});

test("time manager applies weather ambiences with month weights", () => {
  const timeManager = new TimeManager();
  timeManager.configure({
    start: "0001-01-01 08:00",
    weather: {
      enabled: true,
      default: {
        ambiences: {
          clear: {
            weather: null,
            weight: { default: 0 },
            duration: { hours: 1 },
          },
          rain: {
            weather: {
              effect: "rain",
              params: { density: 180 },
            },
            weight: { default: 0, months: { 1: 100 } },
            duration: { hours: 1 },
          },
        },
      },
    },
  });
  const map = createRuntimeMap("map1");

  timeManager.registerMap(map as any);

  expect(map.setWeather).toHaveBeenCalledWith(expect.objectContaining({
    effect: "rain",
    params: { density: 180 },
    startedAt: expect.any(Number),
  }), undefined);
  expect(map.clearWeather).not.toHaveBeenCalled();
});

test("time manager prefers map weather table over the default table", () => {
  const timeManager = new TimeManager();
  timeManager.configure({
    start: "0001-01-01 08:00",
    weather: {
      enabled: true,
      default: {
        ambiences: {
          rain: {
            weather: { effect: "rain" },
            weight: 100,
            duration: { hours: 1 },
          },
        },
      },
      maps: {
        map2: {
          ambiences: {
            fog: {
              weather: { effect: "fog" },
              weight: 100,
              duration: { hours: 1 },
            },
          },
        },
      },
    },
  });
  const map1 = createRuntimeMap("map1");
  const map2 = createRuntimeMap("map2");

  timeManager.registerMap(map1 as any);
  timeManager.registerMap(map2 as any);

  expect(map1.setWeather).toHaveBeenCalledWith(expect.objectContaining({ effect: "rain" }), undefined);
  expect(map2.setWeather).toHaveBeenCalledWith(expect.objectContaining({ effect: "fog" }), undefined);
});

test("time manager can roll a clear weather ambience", () => {
  const timeManager = new TimeManager();
  timeManager.configure({
    start: "0001-01-01 08:00",
    weather: {
      enabled: true,
      default: {
        ambiences: {
          clear: {
            weather: null,
            weight: 100,
            duration: { hours: 2 },
          },
        },
      },
    },
  });
  const map = createRuntimeMap("map1");

  timeManager.registerMap(map as any);

  expect(map.clearWeather).toHaveBeenCalledWith(undefined);
  expect(map.setWeather).not.toHaveBeenCalled();
});

test("time manager refreshes weather when ambience duration expires", () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));

  const timeManager = new TimeManager();
  timeManager.configure({
    start: "0001-01-01 08:00",
    scale: 60,
    weather: {
      enabled: true,
      default: {
        ambiences: {
          cloud: {
            weather: { effect: "cloud" },
            weight: 100,
            duration: { minutes: 1 },
          },
        },
      },
    },
  });
  const map = createRuntimeMap("map1");

  timeManager.registerMap(map as any);
  expect(map.setWeather).toHaveBeenCalledTimes(1);

  vi.advanceTimersByTime(1000);

  expect(map.setWeather).toHaveBeenCalledTimes(2);
});

test("time manager leaves manual weather untouched when weather config is omitted", () => {
  const timeManager = new TimeManager();
  timeManager.configure({
    start: "0001-01-01 08:00",
  });
  const map = createRuntimeMap("map1");

  timeManager.registerMap(map as any);

  expect(map.setWeather).not.toHaveBeenCalled();
  expect(map.clearWeather).not.toHaveBeenCalled();
});
