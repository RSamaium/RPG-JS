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

describe('authoritative recoil', () => {
  it('does not predict or send held movement while recoiling', async () => {
    const engine = Object.create(RpgClientEngine.prototype) as any;
    const player = { knockbackActive: () => true, canMove: true };
    const interrupt = vi.fn();
    Object.assign(engine, { sceneMap: { getCurrentPlayer: () => player }, interruptCurrentPlayerMovement: interrupt });
    await engine.processInput({ input: Direction.Left });
    expect(interrupt).toHaveBeenCalledWith(player);
  });

  it.each([true, false])('accepts recoil coordinates including its final packet (active=%s)', active => {
    const engine = Object.create(RpgClientEngine.prototype) as any;
    const knockbackActive = Object.assign(() => true, { set: vi.fn() });
    const player = { knockbackActive };
    const interrupt = vi.fn();
    Object.assign(engine, {
      playerIdSignal: () => 'local', sceneMap: { getCurrentPlayer: () => player },
      predictionEnabled: true, prediction: {}, interruptCurrentPlayerMovement: interrupt,
    });
    const packet = { players: { local: { x: 42, y: 17, knockbackActive: active } } };
    const result = engine.prepareSyncPayload(packet, { frame: 12, x: 1, y: 1 });
    expect(result.payload).toEqual(packet);
    expect(result.serverDrivenMovement).toBe(true);
    expect(result.localPredictionSnapshot).toBeUndefined();
    expect(interrupt).toHaveBeenCalledWith(player);
  });
});

it('discards buffered recoil trajectories for observers without mutating the received packet', () => {
  const engine = Object.create(RpgClientEngine.prototype) as any;
  const remote = { knockbackActive: Object.assign(() => true, { set: vi.fn() }), frames: [{ x: 0, y: 0 }] };
  Object.assign(engine, {
    playerIdSignal: () => 'local', sceneMap: { players: () => ({ remote }) },
    shouldPreserveLocalPlayerPosition: () => false,
  });
  const packet = { players: { remote: { x: 40, y: 10, knockbackActive: false, _frames: [{ x: 1, y: 0 }] } } };
  const result = engine.prepareSyncPayload(packet);
  expect(result.payload.players.remote._frames).toBeUndefined();
  expect(packet.players.remote._frames).toHaveLength(1);
  expect(remote.frames).toEqual([]);
});
