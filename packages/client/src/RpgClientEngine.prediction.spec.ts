import { Direction, PredictionController } from "@rpgjs/common";
import { describe, expect, it, vi } from "vitest";
import { RpgClientEngine } from "./RpgClientEngine";

describe("RpgClientEngine prediction input scheduling", () => {
  it("sends same-tick inputs together only after their predicted physics state is attached", async () => {
    const predictedState = { x: 140, y: 100, direction: Direction.Down };
    const prediction = new PredictionController<Direction, Direction>({
      getPhysicsTick: () => 10,
      getCurrentState: () => predictedState,
      setAuthoritativeState: vi.fn(),
    });
    const emit = vi.fn();
    const engine = Object.create(RpgClientEngine.prototype) as any;
    Object.assign(engine, {
      stopProcessingInput: false,
      predictionEnabled: true,
      prediction,
      inputFrameCounter: 0,
      pendingPredictionFrames: [],
      lastMovePathSentAt: 0,
      lastMovePathSentFrame: 0,
      MAX_MOVE_TRAJECTORY_POINTS: 240,
      sceneMap: {
        getCurrentPlayer: () => ({ canMove: true }),
      },
      playerIdSignal: () => "local",
      hooks: {
        callHooks: vi.fn(() => ({ subscribe: vi.fn() })),
      },
      webSocket: { emit },
      ensureCurrentPlayerBody: () => true,
      applyPredictedMovementInput: vi.fn(() => true),
      getLocalPlayerState: () => predictedState,
    });

    await engine.processInput({ input: Direction.Right });
    await engine.processInput({ input: Direction.Down });

    expect(emit).not.toHaveBeenCalled();
    expect(prediction.getPendingInputs().map((entry) => entry.tick)).toEqual([10, 10]);

    engine.flushPendingPredictedStates();

    expect(emit).toHaveBeenCalledTimes(1);
    expect(emit).toHaveBeenCalledWith("move", expect.objectContaining({
      input: Direction.Down,
      frame: 2,
      tick: 10,
      trajectory: [
        expect.objectContaining({ frame: 1, tick: 10, x: 140, y: 100 }),
        expect.objectContaining({ frame: 2, tick: 10, x: 140, y: 100 }),
      ],
    }));
    expect(prediction.getPendingInputs().map((entry) => entry.state)).toEqual([
      predictedState,
      predictedState,
    ]);
  });

  it("replays pending inputs from the same client tick with one physics step", () => {
    const replayedState = { x: 160, y: 100, direction: Direction.Down };
    const attachPredictedState = vi.fn();
    const stepPredictionTick = vi.fn();
    const applyPredictedMovementInput = vi.fn(() => true);
    const player = { canMove: true };
    const engine = Object.create(RpgClientEngine.prototype) as any;
    Object.assign(engine, {
      prediction: { attachPredictedState },
      sceneMap: {
        stopMovement: vi.fn(),
        stepPredictionTick,
      },
      getCurrentPlayer: () => player,
      applyAuthoritativeState: vi.fn(),
      applyPredictedMovementInput,
      getLocalPlayerState: () => replayedState,
    });

    engine.reconcilePrediction(
      { x: 120, y: 100, direction: Direction.Right },
      [
        { frame: 8, tick: 14, timestamp: 1, direction: Direction.Right },
        { frame: 9, tick: 14, timestamp: 2, direction: Direction.Down },
      ],
    );

    expect(applyPredictedMovementInput).toHaveBeenNthCalledWith(1, player, Direction.Right);
    expect(applyPredictedMovementInput).toHaveBeenNthCalledWith(2, player, Direction.Down);
    expect(stepPredictionTick).toHaveBeenCalledTimes(1);
    expect(attachPredictedState).toHaveBeenCalledTimes(2);
    expect(attachPredictedState).toHaveBeenNthCalledWith(1, 8, replayedState);
    expect(attachPredictedState).toHaveBeenNthCalledWith(2, 9, replayedState);
  });
});
