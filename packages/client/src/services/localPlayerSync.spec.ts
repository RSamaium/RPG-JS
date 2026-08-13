import { PredictionController } from "@rpgjs/common";
import { describe, expect, it } from "vitest";
import {
  hasAuthoritativePredictionState,
  resolvePredictionVisualCorrection,
  routePredictedLocalPlayerSync,
  shouldApplyPredictionReconciliation,
} from "./localPlayerSync";

describe("routePredictedLocalPlayerSync", () => {
  it("routes the local position through prediction without mutating the sync packet", () => {
    const packet = {
      players: {
        local: {
          x: 1254,
          y: 300,
          direction: "right",
          _frames: [1, 2],
          hp: 90,
        },
        remote: { x: 40, y: 50, direction: "left" },
      },
    };

    const routed = routePredictedLocalPlayerSync<string>(packet, "local");

    expect(routed.snapshot).toEqual({ x: 1254, y: 300, direction: "right" });
    expect(routed.payload.players.local).toEqual({ hp: 90 });
    expect(routed.payload.players.remote).toEqual(packet.players.remote);
    expect(packet.players.local).toEqual({
      x: 1254,
      y: 300,
      direction: "right",
      _frames: [1, 2],
      hp: 90,
    });
  });

  it("filters local sync coordinates without returning a second snapshot when the ACK is authoritative", () => {
    const packet = {
      players: {
        local: { x: 1254, y: 300, direction: "right", _frames: [1], hp: 90 },
      },
    };

    const routed = routePredictedLocalPlayerSync<string>(
      packet,
      "local",
      undefined,
      { frame: 12, x: 1248, y: 300 },
    );

    expect(routed.payload.players.local).toEqual({ hp: 90 });
    expect(routed.snapshot).toBeUndefined();
  });

  it("keeps the legacy snapshot fallback when an ACK has no authoritative coordinates", () => {
    const routed = routePredictedLocalPlayerSync<string>(
      { players: { local: { x: 1254, y: 300, direction: "right" } } },
      "local",
      undefined,
      { frame: 12 },
    );

    expect(routed.payload.players.local).toEqual({});
    expect(routed.snapshot).toEqual({ x: 1254, y: 300, direction: "right" });
  });

  it("requires finite frame and coordinates for an authoritative ACK", () => {
    expect(hasAuthoritativePredictionState({ frame: 1, x: 10, y: 20 })).toBe(true);
    expect(hasAuthoritativePredictionState({ frame: 1, x: 10 })).toBe(false);
    expect(hasAuthoritativePredictionState({ frame: 1, x: Number.NaN, y: 20 })).toBe(false);
  });

  it("does not apply a stale correction that is already within the visible threshold", () => {
    expect(shouldApplyPredictionReconciliation(
      { x: 1010.716, y: 480 },
      { x: 1040, y: 480 },
      0,
      30,
    )).toBe(false);
  });

  it("still reconciles material drift or an ACK that requires pending input replay", () => {
    expect(shouldApplyPredictionReconciliation(
      { x: 1009, y: 480 },
      { x: 1040, y: 480 },
      0,
      30,
    )).toBe(true);
    expect(shouldApplyPredictionReconciliation(
      { x: 1015, y: 480 },
      { x: 1040, y: 480 },
      1,
      30,
    )).toBe(true);
  });

  it("preserves the rendered position while a physics correction is eased out", () => {
    const correction = resolvePredictionVisualCorrection(
      { x: 1519.083, y: 480 },
      { x: 1556, y: 480 },
    );
    expect(correction.offsetX).toBeCloseTo(-36.917);
    expect(correction.offsetY).toBe(0);
    expect(correction.duration).toBeCloseTo(147.668);
    expect(resolvePredictionVisualCorrection(
      { x: 1556, y: 480 },
      { x: 1556, y: 480 },
    )).toEqual({ offsetX: 0, offsetY: 0, duration: 0 });
  });

  it("prevents a below-threshold snapshot from producing a visible jump", () => {
    let current = { x: 1229, y: 300, direction: "right" };
    const applied: typeof current[] = [];
    const prediction = new PredictionController<string, string>({
      correctionThreshold: 30,
      getPhysicsTick: () => 1,
      getCurrentState: () => current,
      setAuthoritativeState: (state) => {
        current = state as typeof current;
        applied.push(current);
      },
    });
    const routed = routePredictedLocalPlayerSync<string>({
      players: {
        local: { x: 1254, y: 300, direction: "right" },
      },
    }, "local");

    prediction.queueServerSnapshot(routed.snapshot!);

    expect(routed.payload.players.local).toEqual({});
    expect(applied).toEqual([]);
    expect(current).toEqual({ x: 1229, y: 300, direction: "right" });
  });

  it("still applies an authoritative snapshot above the correction threshold", () => {
    let current = { x: 100, y: 300, direction: "right" };
    const applied: typeof current[] = [];
    const prediction = new PredictionController<string, string>({
      correctionThreshold: 30,
      getPhysicsTick: () => 1,
      getCurrentState: () => current,
      setAuthoritativeState: (state) => {
        current = state as typeof current;
        applied.push(current);
      },
    });
    const routed = routePredictedLocalPlayerSync<string>({
      players: {
        local: { x: 150, y: 300, direction: "right" },
      },
    }, "local");

    prediction.queueServerSnapshot(routed.snapshot!);

    expect(applied).toEqual([{ x: 150, y: 300, direction: "right" }]);
    expect(current).toEqual({ x: 150, y: 300, direction: "right" });
  });

  it("leaves incomplete local position patches in the generic sync payload", () => {
    const payload = { players: { local: { x: 10, hp: 50 } } };

    const routed = routePredictedLocalPlayerSync(payload, "local");

    expect(routed).toEqual({ payload });
  });

  it("routes a partial axis patch using the current predicted position", () => {
    const payload = { players: { local: { x: 1254, hp: 50 } } };

    const routed = routePredictedLocalPlayerSync(payload, "local", {
      x: 1229,
      y: 300,
      direction: "right",
    });

    expect(routed.snapshot).toEqual({ x: 1254, y: 300, direction: "right" });
    expect(routed.payload.players.local).toEqual({ hp: 50 });
  });
});
