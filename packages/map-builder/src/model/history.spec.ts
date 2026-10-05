// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { createMapModel } from "./model";
import type { MapPatch } from "./patches";
import { asyncCommitter, forest, spyCommitter } from "./__fixtures__";

const move = (id: string, x: number, y = 0): MapPatch => ({ type: "element.move", id, x, y });
const addElement = (id: string): MapPatch => ({ type: "element.add", element: { id, kind: "tree-oak", x: 0, y: 0 } });
const addEvent = (id: string): MapPatch => ({ type: "event.add", event: { id, kind: "loot", x: 0, y: 0 } });
const setExtension = (value: number): MapPatch => ({ type: "extension.set", id: "terrain", value: { version: value } });

const ids = (model: ReturnType<typeof createMapModel>) => model.state.elements.map((e) => e.id);

describe("history timeline (behaviours ported from the Studio editor)", () => {
  it("has nothing to undo right after creation", () => {
    const model = createMapModel(forest());
    expect(model.history.canUndo).toBe(false);
    expect(model.history.canRedo).toBe(false);
    expect(model.history.undo()).toBeNull();
    expect(model.history.redo()).toBeNull();
  });

  it("undoes the last action whatever it changed", () => {
    const model = createMapModel(forest());
    const initial = model.getDefinition();
    model.apply(addElement("n1"));
    model.apply(addEvent("e2"));
    model.apply(setExtension(2));

    expect(model.history.undo()).toMatchObject({ ok: true });
    expect(model.state.extensions).toEqual({ terrain: { version: 1 } });
    expect(model.history.undo()).toMatchObject({ ok: true });
    expect(model.getEvent("e2")).toBeUndefined();
    expect(model.history.undo()).toMatchObject({ ok: true });
    expect(model.getDefinition()).toEqual(initial);
    expect(model.history.undo()).toBeNull();
  });

  it("redoes undone actions in order, and a new action clears the redo", () => {
    const model = createMapModel(forest());
    model.apply(addElement("n1"));
    model.apply(addEvent("e2"));
    model.history.undo();
    model.history.undo();

    model.history.redo();
    expect(ids(model)).toContain("n1");
    expect(model.getEvent("e2")).toBeUndefined();

    model.apply(setExtension(9));
    expect(model.history.canRedo).toBe(false);
    expect(model.history.redo()).toBeNull();
    model.history.undo();
    model.history.undo();
    expect(ids(model)).not.toContain("n1");
  });

  it("undoes everything saved inside a group as one action", () => {
    const model = createMapModel(forest());
    const initial = model.getDefinition();
    model.history.group(() => {
      model.apply(addElement("n1"));
      model.apply(addEvent("e2"));
    });
    expect(model.history.status.undoDepth).toBe(1);

    model.history.undo();
    expect(model.getDefinition()).toEqual(initial);
    model.history.redo();
    expect(ids(model)).toContain("n1");
    expect(model.getEvent("e2")).toBeDefined();
  });

  it("flattens nested groups, still records when the group throws, and ignores empty groups", () => {
    const model = createMapModel(forest());
    model.history.group(() => {
      model.apply(addElement("n1"));
      model.history.group(() => model.apply(addElement("n2")));
    });
    expect(model.history.status.undoDepth).toBe(1);

    expect(() =>
      model.history.group(() => {
        model.apply(addElement("n3"));
        throw new Error("boom");
      }),
    ).toThrow("boom");
    expect(model.history.status.undoDepth).toBe(2);

    model.history.group(() => undefined);
    expect(model.history.status.undoDepth).toBe(2);
  });

  it("merges consecutive changes with the same coalesce key into one step (amending an entry)", () => {
    const model = createMapModel(forest());
    model.apply(move("t1", 1), { coalesce: "drag:t1" });
    model.apply(move("t1", 2), { coalesce: "drag:t1" });
    model.apply(move("t1", 3), { coalesce: "drag:t1" });
    expect(model.history.status.undoDepth).toBe(1);

    model.history.undo();
    expect(model.getElement("t1")).toMatchObject({ x: 128, y: 96 });
    model.history.redo();
    expect(model.getElement("t1")?.x).toBe(3);
    expect(model.history.redo()).toBeNull();
  });

  it("does not merge across different keys or an unkeyed action in between", () => {
    const model = createMapModel(forest());
    model.apply(move("t1", 1), { coalesce: "a" });
    model.apply(move("t1", 2), { coalesce: "b" });
    model.apply(move("t1", 3), { coalesce: "a" });
    model.apply(move("t1", 4));
    model.apply(move("t1", 5), { coalesce: "a" });
    expect(model.history.status.undoDepth).toBe(5);
  });

  it("clear() forgets every action", () => {
    const model = createMapModel(forest());
    model.apply(addElement("n1"));
    model.history.undo();
    model.history.clear();
    expect(model.history.status).toEqual({ canUndo: false, canRedo: false, undoDepth: 0, redoDepth: 0 });
    expect(model.history.undo()).toBeNull();
    expect(ids(model)).not.toContain("n1");
  });
});

describe("history behaviour specific to patches", () => {
  it("treats a batch as a single action", () => {
    const model = createMapModel(forest());
    const initial = model.getDefinition();
    model.apply([addElement("n1"), addEvent("e2"), move("t1", 50)]);
    expect(model.history.status.undoDepth).toBe(1);
    model.history.undo();
    expect(model.getDefinition()).toEqual(initial);
  });

  it("keeps at most `limit` actions, dropping the oldest", () => {
    const model = createMapModel(forest(), { history: { limit: 3 } });
    for (let i = 1; i <= 5; i++) model.apply(move("t1", i));
    expect(model.history.status.undoDepth).toBe(3);
    while (model.history.canUndo) model.history.undo();
    expect(model.getElement("t1")?.x).toBe(2); // the first two moves can no longer be undone
  });

  it("defaults to 50 actions", () => {
    const model = createMapModel(forest());
    for (let i = 1; i <= 60; i++) model.apply(move("t1", i));
    expect(model.history.status.undoDepth).toBe(50);
  });

  it("can be disabled", () => {
    for (const history of [false, { limit: 0 }] as const) {
      const model = createMapModel(forest(), { history });
      model.apply(move("t1", 1));
      expect(model.history.canUndo).toBe(false);
      expect(model.history.undo()).toBeNull();
    }
  });

  it("does not record a rejected change", () => {
    const model = createMapModel(forest());
    model.apply(move("nope", 1));
    expect(model.history.canUndo).toBe(false);
  });

  it("replays patches that carried a base revision (it is dropped when recorded)", () => {
    const model = createMapModel(forest());
    model.apply({ ...move("t1", 1), baseRevision: 0 });
    model.apply({ ...move("t1", 2), baseRevision: 1 });
    expect(model.history.undo()).toMatchObject({ ok: true });
    expect(model.history.redo()).toMatchObject({ ok: true });
    expect(model.getElement("t1")?.x).toBe(2);
  });

  it("restores a removed element at its original position, again after redo and a second undo", () => {
    const model = createMapModel(forest());
    model.apply({ type: "element.remove", id: "t1" });
    model.history.undo();
    expect(ids(model)).toEqual(["home", "t1", "t2"]);
    model.history.redo();
    model.history.undo();
    expect(ids(model)).toEqual(["home", "t1", "t2"]);
  });

  it("undo and redo get their own revision, and are not recorded as new actions", () => {
    const model = createMapModel(forest());
    model.apply(move("t1", 1));
    expect(model.history.undo()).toMatchObject({ ok: true, revision: 2 });
    expect(model.history.status).toMatchObject({ undoDepth: 0, redoDepth: 1 });
    expect(model.history.redo()).toMatchObject({ ok: true, revision: 3 });
    expect(model.history.status).toMatchObject({ undoDepth: 1, redoDepth: 0 });
  });

  it("goes through the committer, so undo is persisted like any other change", async () => {
    const persist = vi.fn();
    const committer = spyCommitter({ persist });
    const model = createMapModel(forest(), { committer });
    model.apply(move("t1", 1));
    model.history.undo();
    await committer.flush();
    expect(persist).toHaveBeenCalledTimes(2);
    expect(persist.mock.calls[1]![0]).toEqual([move("t1", 128, 96)]);
  });

  it("ignores changes made by someone else (remote origin)", () => {
    const committer = spyCommitter();
    const model = createMapModel(forest(), { committer });
    committer.host().integrate([move("t2", 7)], { origin: "remote" });
    expect(model.history.canUndo).toBe(false);
    expect(model.getElement("t2")?.x).toBe(7);
  });

  it("leaves the stacks untouched when an undo is rejected", () => {
    const committer = spyCommitter();
    const model = createMapModel(forest(), { committer });
    model.apply(move("t1", 1));
    committer.host().integrate([{ type: "element.remove", id: "t1" }], { origin: "remote" });

    expect(model.history.undo()).toMatchObject({ ok: false, rejection: { code: "not-found" } });
    expect(model.history.status).toMatchObject({ undoDepth: 1, redoDepth: 0 });
  });

  it("notifies its subscribers of every change of status, and isolates a failing one", () => {
    const onListenerError = vi.fn();
    const model = createMapModel(forest(), { onListenerError });
    const seen: boolean[] = [];
    model.history.subscribe(() => {
      throw new Error("boom");
    });
    model.history.subscribe((status) => seen.push(status.canUndo));
    model.apply(move("t1", 1));
    model.history.undo();
    expect(seen).toEqual([true, false]);
    expect(onListenerError).toHaveBeenCalledTimes(2);
  });
});

describe("history with an asynchronous committer", () => {
  it("returns promises, and only moves the stacks once the change is confirmed", async () => {
    const model = createMapModel(forest(), { committer: asyncCommitter() });
    await model.apply(move("t1", 1));
    const pending = model.history.undo()!;
    expect(pending).toBeInstanceOf(Promise);
    expect(model.history.status.undoDepth).toBe(1);
    await expect(pending).resolves.toMatchObject({ ok: true });
    expect(model.history.status).toMatchObject({ undoDepth: 0, redoDepth: 1 });
    await model.history.redo();
    expect(model.getElement("t1")?.x).toBe(1);
  });

  it("refuses a second undo while one is in flight, instead of undoing twice", async () => {
    const committer = asyncCommitter();
    const model = createMapModel(forest(), { committer });
    await model.apply(move("t1", 1));
    await model.apply(move("t1", 2));
    const calls = committer.calls;
    const first = model.history.undo();
    expect(model.history.undo()).toBeNull();
    await first;
    expect(committer.calls).toBe(calls + 1);
    expect(model.getElement("t1")?.x).toBe(1);
  });
});
