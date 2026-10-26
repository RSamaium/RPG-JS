import { describe, expect, it } from "vitest";
import { DEFAULT_REMOTE_SMOOTHING, RemoteSmoothing, resolveRemoteSmoothingOptions } from "./remote-smoothing";

describe("remote character smoothing", () => {
  it("jumps on the first update and after a long silence", () => {
    const smoothing = new RemoteSmoothing();
    expect(smoothing.duration(0, 4, 1000)).toBe(0);
    expect(smoothing.duration(4, 8, 1050)).toBeGreaterThan(0);
    expect(smoothing.duration(8, 12, 1400)).toBe(0);
  });

  it("walks for 1.5 times the measured update interval", () => {
    const smoothing = new RemoteSmoothing();
    smoothing.duration(0, 2, 1000);
    // the interval starts at 50 ms and the server keeps that rhythm: 50, 50, 50...
    expect(smoothing.duration(2, 4, 1050)).toBe(75);
    expect(smoothing.duration(4, 6, 1100)).toBe(75);
  });

  it("follows a faster or slower server", () => {
    const fast = new RemoteSmoothing();
    fast.duration(0, 1, 0);
    let now = 0;
    let duration = 0;
    for (let i = 0; i < 60; i++) duration = fast.duration(i, i + 1, (now += 20));
    expect(duration).toBe(30);

    const slow = new RemoteSmoothing();
    slow.duration(0, 1, 0);
    now = 0;
    for (let i = 0; i < 12; i++) duration = slow.duration(i, i + 1, (now += 200));
    expect(duration).toBe(150);
  });

  it("keeps walking until the next burst when the updates come in bursts", () => {
    // two updates a few milliseconds apart, then a 50 ms gap: the walk must not end before the next burst
    const smoothing = new RemoteSmoothing();
    smoothing.duration(0, 1, 0);
    let now = 0;
    const durations: number[] = [];
    for (let i = 0; i < 20; i++) {
      durations.push(smoothing.duration(i, i + 1, (now += 13)));
      durations.push(smoothing.duration(i, i + 1, (now += 50)));
    }
    expect(Math.min(...durations.slice(-10))).toBeGreaterThanOrEqual(65);
  });

  it("keeps the walk between the minimum and the maximum", () => {
    const bounds = () => ({ ...DEFAULT_REMOTE_SMOOTHING, factor: 0.5, minDuration: 40, maxDuration: 60 });
    const short = new RemoteSmoothing(bounds);
    short.duration(0, 1, 100);
    expect(short.duration(1, 2, 101)).toBe(40);

    const long = new RemoteSmoothing(bounds);
    long.duration(0, 1, 100);
    expect(long.duration(1, 2, 300)).toBe(60);
  });

  it("jumps for a teleport or a map change instead of sliding across the map", () => {
    const smoothing = new RemoteSmoothing();
    smoothing.duration(0, 1, 0);
    expect(smoothing.duration(1, 500, 50)).toBe(0);
    expect(smoothing.duration(500, 501, 100)).toBeGreaterThan(0);
  });

  it("does nothing when it is disabled", () => {
    const smoothing = new RemoteSmoothing(() => resolveRemoteSmoothingOptions(false));
    smoothing.duration(0, 1, 0);
    expect(smoothing.duration(1, 2, 50)).toBe(0);
  });

  it("reads its options at each update", () => {
    let options = { ...DEFAULT_REMOTE_SMOOTHING };
    const smoothing = new RemoteSmoothing(() => options);
    smoothing.duration(0, 1, 0);
    expect(smoothing.duration(1, 2, 50)).toBe(75);
    options = { ...options, factor: 1 };
    expect(smoothing.duration(2, 3, 100)).toBe(50);
  });
});

describe("remoteSmoothing option of the client config", () => {
  it("is on by default", () => {
    expect(resolveRemoteSmoothingOptions(undefined)).toEqual(DEFAULT_REMOTE_SMOOTHING);
    expect(resolveRemoteSmoothingOptions(true)).toEqual(DEFAULT_REMOTE_SMOOTHING);
  });

  it("is turned off with false or enabled: false", () => {
    expect(resolveRemoteSmoothingOptions(false).enabled).toBe(false);
    expect(resolveRemoteSmoothingOptions({ enabled: false }).enabled).toBe(false);
  });

  it("overrides only the given values and ignores unusable ones", () => {
    expect(resolveRemoteSmoothingOptions({ factor: 2, maxDuration: "x", maxGap: -1, teleportDistance: 64 })).toEqual({
      ...DEFAULT_REMOTE_SMOOTHING,
      factor: 2,
      teleportDistance: 64,
    });
  });

  it("never lets the maximum be below the minimum", () => {
    expect(resolveRemoteSmoothingOptions({ minDuration: 100, maxDuration: 20 })).toMatchObject({ minDuration: 100, maxDuration: 100 });
  });
});
