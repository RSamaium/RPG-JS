// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { localCommitter } from "./committer";
import { createMapModel } from "./model";
import type { MapPatch } from "./patches";
import { forest } from "./__fixtures__";

const move = (x: number): MapPatch => ({ type: "element.move", id: "t1", x, y: 0 });

describe("localCommitter", () => {
  it("applies immediately and synchronously", () => {
    const model = createMapModel(forest(), { committer: localCommitter() });
    const result = model.apply(move(5));
    expect(result).toMatchObject({ ok: true, revision: 1 });
    expect(model.getElement("t1")?.x).toBe(5);
  });

  it("is the default committer", () => {
    const model = createMapModel(forest());
    expect(model.apply(move(5)).ok).toBe(true);
  });

  it("calls persist with the applied patches and the revision", async () => {
    const persist = vi.fn();
    const committer = localCommitter({ persist });
    const model = createMapModel(forest(), { committer });
    model.apply(move(1));
    model.apply([move(2), move(3)]);
    await committer.flush();
    expect(persist.mock.calls).toEqual([
      [[move(1)], 1],
      [[move(2), move(3)], 2],
    ]);
  });

  it("does not persist a rejected change", async () => {
    const persist = vi.fn();
    const committer = localCommitter({ persist });
    const model = createMapModel(forest(), { committer });
    model.apply({ type: "element.move", id: "nope", x: 1, y: 1 });
    await committer.flush();
    expect(persist).not.toHaveBeenCalled();
  });

  it("persists in order even when saves take different times", async () => {
    const order: number[] = [];
    const committer = localCommitter({
      persist: async (_patches, revision) => {
        await new Promise((resolve) => setTimeout(resolve, revision === 1 ? 20 : 0));
        order.push(revision);
      },
    });
    const model = createMapModel(forest(), { committer });
    model.apply(move(1));
    model.apply(move(2));
    model.apply(move(3));
    await committer.flush();
    expect(order).toEqual([1, 2, 3]);
  });

  it("reports a failing save to onError without affecting apply, and keeps saving the next ones", async () => {
    const onError = vi.fn();
    const persist = vi.fn(async (_patches: readonly MapPatch[], revision: number) => {
      if (revision === 1) throw new Error("network down");
    });
    const committer = localCommitter({ persist, onError });
    const model = createMapModel(forest(), { committer });
    expect(model.apply(move(1)).ok).toBe(true);
    model.apply(move(2));
    await committer.flush();
    expect(onError).toHaveBeenCalledOnce();
    expect(String(onError.mock.calls[0]![0])).toMatch(/network down/);
    expect(persist).toHaveBeenCalledTimes(2);
    expect(model.getElement("t1")?.x).toBe(2);
  });

  it("also reports a synchronous throw of persist", async () => {
    const onError = vi.fn();
    const committer = localCommitter({
      persist: () => {
        throw new Error("sync");
      },
      onError,
    });
    const model = createMapModel(forest(), { committer });
    expect(model.apply(move(1)).ok).toBe(true);
    await committer.flush();
    expect(onError).toHaveBeenCalledOnce();
  });

  it("can only serve one model, and must be attached before use", () => {
    const committer = localCommitter();
    createMapModel(forest(), { committer });
    expect(() => createMapModel(forest(), { committer })).toThrow(/only be attached to one model/);
    expect(() => localCommitter().commit({ patches: [move(1)], record: true })).toThrow(/not attached/);
  });
});
