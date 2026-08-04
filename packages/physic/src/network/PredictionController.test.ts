import { describe, expect, it } from "vitest";
import { PredictionController, type PredictionState } from "./PredictionController";

describe("PredictionController", () => {
  it("keeps only unacknowledged inputs after an ack", () => {
    let tick = 10;
    let current: PredictionState<string> = { x: 100, y: 100, direction: "right" };
    const appliedStates: PredictionState<string>[] = [];

    const controller = new PredictionController<string>({
      correctionThreshold: 5,
      getPhysicsTick: () => tick,
      getCurrentState: () => current,
      setAuthoritativeState: (state) => {
        appliedStates.push(state);
        current = state;
      },
    });

    const first = controller.recordInput("right", Date.now());
    tick += 1;
    const second = controller.recordInput("right", Date.now() + 1);

    const ack = controller.applyServerAck({
      frame: first.frame,
      serverTick: 20,
      state: { x: 102, y: 100, direction: "right" },
    });

    expect(ack.acknowledgedFrame).toBe(first.frame);
    expect(ack.acknowledgedTick).toBe(20);
    expect(ack.needsReconciliation).toBe(false);
    expect(ack.pendingInputs.map((entry) => entry.frame)).toEqual([second.frame]);
    expect(appliedStates).toHaveLength(0);
  });

  it("marks ack as needing reconciliation when drift is above threshold", () => {
    const current: PredictionState<string> = { x: 100, y: 100, direction: "right" };

    const controller = new PredictionController<string>({
      correctionThreshold: 5,
      getPhysicsTick: () => 1,
      getCurrentState: () => current,
      setAuthoritativeState: () => {
        // no-op for this unit test
      },
    });

    controller.recordInput("right", Date.now());

    const ack = controller.applyServerAck({
      frame: 1,
      serverTick: 5,
      state: { x: 0, y: 0, direction: "left" },
    });

    expect(ack.needsReconciliation).toBe(true);
    expect(ack.pendingInputs).toHaveLength(0);
  });

  it("re-evaluates reconciliation when server tick advances on the same frame", () => {
    let tick = 1;
    let current: PredictionState<string> = { x: 52, y: 100, direction: "right" };

    const controller = new PredictionController<string>({
      correctionThreshold: 5,
      getPhysicsTick: () => tick,
      getCurrentState: () => current,
      setAuthoritativeState: (state) => {
        current = state;
      },
    });

    const input = controller.recordInput("right", Date.now());
    controller.attachPredictedState(input.frame, current);

    const firstAck = controller.applyServerAck({
      frame: input.frame,
      serverTick: 100,
      state: { x: 52, y: 100, direction: "right" },
    });

    expect(firstAck.needsReconciliation).toBe(false);
    expect(firstAck.acknowledgedTick).toBe(100);

    current = { x: 30, y: 100, direction: "right" };
    tick += 1;

    const secondAck = controller.applyServerAck({
      frame: input.frame,
      serverTick: 101,
      state: { x: 52, y: 100, direction: "right" },
    });

    expect(secondAck.needsReconciliation).toBe(true);
    expect(secondAck.acknowledgedFrame).toBe(input.frame);
    expect(secondAck.acknowledgedTick).toBe(101);
  });

  it("does not reconcile a repeated ack against the current state while newer inputs are pending", () => {
    let current: PredictionState<string> = { x: 52, y: 100, direction: "right" };

    const controller = new PredictionController<string>({
      correctionThreshold: 5,
      getPhysicsTick: () => 1,
      getCurrentState: () => current,
      setAuthoritativeState: (state) => {
        current = state;
      },
    });

    const acknowledged = controller.recordInput("right", Date.now());
    controller.attachPredictedState(acknowledged.frame, current);
    controller.applyServerAck({
      frame: acknowledged.frame,
      serverTick: 100,
      state: current,
    });

    current = { x: 82, y: 100, direction: "right" };
    const pending = controller.recordInput("right", Date.now() + 1);
    controller.attachPredictedState(pending.frame, current);

    const repeatedAck = controller.applyServerAck({
      frame: acknowledged.frame,
      serverTick: 101,
      state: { x: 52, y: 100, direction: "right" },
    });

    expect(repeatedAck.needsReconciliation).toBe(false);
    expect(repeatedAck.acknowledgedTick).toBe(101);
    expect(repeatedAck.pendingInputs.map((entry) => entry.frame)).toEqual([pending.frame]);
  });

  it("can clear pending inputs without resetting the next frame", () => {
    const controller = new PredictionController<string>({
      getPhysicsTick: () => 1,
      getCurrentState: () => ({ x: 0, y: 0, direction: "right" }),
      setAuthoritativeState: () => {
        // no-op for this unit test
      },
    });

    const first = controller.recordInput("right", Date.now());
    controller.recordInput("right", Date.now() + 1);

    controller.clearPendingInputs();

    expect(controller.getPendingInputs()).toHaveLength(0);

    const staleAck = controller.applyServerAck({
      frame: first.frame,
      serverTick: 1,
      state: { x: 30, y: 0, direction: "right" },
    });
    expect(staleAck.needsReconciliation).toBe(false);
    expect(controller.getPendingInputs()).toHaveLength(0);

    const next = controller.recordInput("right", Date.now() + 2);
    expect(next.frame).toBe(3);
  });
});
