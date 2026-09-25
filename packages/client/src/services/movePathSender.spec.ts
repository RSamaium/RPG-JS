import { describe, expect, it } from "vitest";
import { Direction } from "@rpgjs/common";
import { MovePathSender, type MovePacket } from "./movePathSender";
import { ServerTickEstimator } from "./serverTickEstimator";

const entry = (frame: number, x: number, withState = true) => ({
  frame,
  tick: frame,
  timestamp: frame * 16,
  direction: Direction.Right,
  ...(withState ? { state: { x, y: 0, direction: Direction.Right } } : {}),
});

describe("MovePathSender", () => {
  it("sends the predicted trajectory and throttles resends without a newer frame", () => {
    const packets: MovePacket[] = [];
    const sender = new MovePathSender((packet) => packets.push(packet));
    const pendingInputs = [entry(1, 10), entry(2, 20), entry(3, 0, false)] as any;

    sender.send({ input: Direction.Right, frame: 2, tick: 2, timestamp: 1000, pendingInputs });
    expect(packets).toHaveLength(1);
    expect(packets[0].trajectory.map((point) => point.frame)).toEqual([1, 2]);

    sender.send({ input: Direction.Right, frame: 2, tick: 2, timestamp: 1050, pendingInputs });
    expect(packets).toHaveLength(1);

    sender.send({ input: Direction.Right, frame: 2, tick: 2, timestamp: 1050, pendingInputs, force: true });
    expect(packets).toHaveLength(2);

    sender.send({ input: Direction.Right, frame: 2, tick: 2, timestamp: 1200, pendingInputs });
    expect(packets).toHaveLength(3);
  });

  it("resets resend tracking", () => {
    const sender = new MovePathSender(() => {});
    sender.reset({ frame: 5, sentAt: 1000 });
    expect(sender.isThrottled(1050)).toBe(true);
    sender.reset();
    expect(sender.isThrottled(1050)).toBe(false);
  });
});

describe("ServerTickEstimator", () => {
  it("extrapolates the last server tick with elapsed time", () => {
    const estimator = new ServerTickEstimator();
    expect(estimator.estimate(16, 1000)).toBeUndefined();
    estimator.update(100, 1000);
    estimator.update(Number.NaN, 1100);
    expect(estimator.estimate(10, 1050)).toBe(105);
  });
});
