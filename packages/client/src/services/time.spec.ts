import { afterEach, expect, test, vi } from "vitest";
import { DEFAULT_TIME_CALENDAR, type TimeSnapshot } from "@rpgjs/common";
import { ClientTimeManager } from "./time";

const snapshot = (patch: Partial<TimeSnapshot> = {}): TimeSnapshot => ({
  elapsedMinutes: 8 * 60,
  scale: 60,
  paused: false,
  serverTimestamp: 1_000_000,
  calendar: { ...DEFAULT_TIME_CALENDAR },
  ...patch,
});

afterEach(() => {
  vi.useRealTimers();
});

test("client time ignores the offset between the server and the client clocks", () => {
  vi.useFakeTimers();
  // The client clock is 10 seconds ahead of the server clock.
  vi.setSystemTime(1_010_000);
  const time = new ClientTimeManager();
  time.acceptSnapshot(snapshot());

  // Received right after the server anchored it: the time did not move.
  expect(time.state(1_010_000)?.elapsedMinutes).toBeCloseTo(8 * 60);
  // 5 real seconds later at 60 game minutes per real minute.
  expect(time.state(1_015_000)?.elapsedMinutes).toBeCloseTo(8 * 60 + 5);
});

test("client time keeps the measured offset when a patch has no new anchor", () => {
  vi.useFakeTimers();
  vi.setSystemTime(1_010_000);
  const time = new ClientTimeManager();
  time.acceptSnapshot(snapshot());

  time.patchSnapshot({ scale: 120 });
  expect(time.state(1_010_000)?.elapsedMinutes).toBeCloseTo(8 * 60);
});

test("client time exposes the hour as a decimal and the phase", () => {
  const time = new ClientTimeManager();
  time.acceptSnapshot(snapshot({ elapsedMinutes: 18 * 60 + 30, paused: true }));
  expect(time.state()?.hourFloat).toBeCloseTo(18.5);
  expect(time.state()?.phase).toBe("dusk");
});
