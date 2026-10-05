// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { localCommitter } from "./committer";
import { createMapModel, type MapChange } from "./model";
import { patchFail, patchOk, type MapPatch } from "./patches";
import { forest } from "./__fixtures__";

const move = (id: string, x: number, y = 0): MapPatch => ({ type: "element.move", id, x, y });

describe("createMapModel", () => {
  it("starts at revision 0, or at the one of a snapshot", () => {
    expect(createMapModel(forest()).revision).toBe(0);
    expect(createMapModel(forest(), { revision: 41 }).revision).toBe(41);
  });

  it("exposes the definition, and getDefinition returns an isolated copy", () => {
    const model = createMapModel(forest());
    expect(model.getDefinition()).toEqual(forest());
    const copy = model.getDefinition() as unknown as { elements: { x: number }[] };
    copy.elements[0]!.x = 9999;
    expect(model.state.elements[0]!.x).toBe(640);
  });

  it("validates and copies the definition it receives", () => {
    const input = forest();
    const model = createMapModel(input);
    expect(model.state).not.toBe(input);
    expect(() => createMapModel({ version: 1, id: "" } as never)).toThrow(/Invalid map definition/);
  });

  it("finds elements and events by id", () => {
    const model = createMapModel(forest());
    expect(model.getElement("t1")?.kind).toBe("tree-oak");
    expect(model.getElement("nope")).toBeUndefined();
    expect(model.getEvent("chest-1")?.graphic).toBe("wood-icon");
  });

  describe("revisions", () => {
    it("increments by one per successful apply, and not at all on a rejection", () => {
      const model = createMapModel(forest());
      expect(model.apply(move("t1", 1))).toMatchObject({ ok: true, revision: 1 });
      expect(model.apply(move("t1", 2))).toMatchObject({ ok: true, revision: 2 });
      expect(model.apply(move("nope", 3)).ok).toBe(false);
      expect(model.revision).toBe(2);
    });
  });

  describe("batches", () => {
    const cut: MapPatch[] = [
      { type: "element.remove", id: "t1" },
      { type: "event.add", event: { id: "wood-1", kind: "loot", x: 128, y: 96, graphic: "wood-icon" } },
    ];

    it("applies every patch under a single revision", () => {
      const model = createMapModel(forest());
      const result = model.apply(cut);
      expect(result).toMatchObject({ ok: true, revision: 1 });
      expect(model.getElement("t1")).toBeUndefined();
      expect(model.getEvent("wood-1")).toBeDefined();
    });

    it("is atomic: when one patch is rejected, nothing is applied", () => {
      const model = createMapModel(forest());
      const before = model.state;
      const result = model.apply([cut[0]!, { type: "event.remove", id: "nope" }]);
      expect(result).toMatchObject({ ok: false, rejection: { code: "not-found", patchIndex: 1 } });
      expect(model.state).toBe(before);
      expect(model.revision).toBe(0);
    });

    it("sees the changes made earlier in the same batch", () => {
      const model = createMapModel(forest());
      expect(model.apply([{ type: "element.remove", id: "t1" }, { type: "element.remove", id: "t1" }]).ok).toBe(false);
      expect(
        model.apply([
          { type: "element.add", element: { id: "n", kind: "tree-oak", x: 0, y: 0 } },
          move("n", 5, 5),
        ]).ok,
      ).toBe(true);
      expect(model.getElement("n")).toMatchObject({ x: 5, y: 5 });
    });

    it("has an inverse that undoes the whole batch at once, in the right order", () => {
      const model = createMapModel(forest());
      const before = model.getDefinition();
      const result = model.apply([move("t1", 1), move("t1", 2), move("t1", 3)]);
      if (!result.ok) throw new Error("rejected");
      expect(model.apply(result.inverse).ok).toBe(true);
      expect(model.getDefinition()).toEqual(before);
    });

    it("rejects an empty batch", () => {
      expect(createMapModel(forest()).apply([])).toMatchObject({ ok: false, rejection: { code: "invalid-patch" } });
    });
  });

  describe("unknown and malformed patches", () => {
    it("rejects an unknown patch type with the index of the culprit", () => {
      const model = createMapModel(forest());
      expect(model.apply([move("t1", 1), { type: "tilling.till" } as never])).toMatchObject({
        ok: false,
        rejection: { code: "unknown-patch", patchIndex: 1 },
      });
      expect(model.revision).toBe(0);
    });

    it("does not crash on garbage coming from the network", () => {
      const model = createMapModel(forest());
      for (const garbage of [null, undefined, 3, {}, { type: 3 }, { type: "element.move" }, { type: "toString" }]) {
        expect(model.apply(garbage as never).ok).toBe(false);
      }
      expect(model.revision).toBe(0);
    });
  });

  describe("stale revisions", () => {
    it("rejects by default a patch computed against another revision", () => {
      const model = createMapModel(forest());
      model.apply(move("t1", 1));
      const result = model.apply({ ...move("t1", 2), baseRevision: 0 });
      expect(result).toMatchObject({ ok: false, rejection: { code: "stale-revision", patchIndex: 0 } });
      expect(model.getElement("t1")?.x).toBe(1);
    });

    it("accepts a patch computed against the current revision", () => {
      const model = createMapModel(forest());
      model.apply(move("t1", 1));
      expect(model.apply({ ...move("t1", 2), baseRevision: 1 }).ok).toBe(true);
    });

    it("can rebase: apply a stale patch when it is still valid", () => {
      const model = createMapModel(forest(), { onStale: "rebase" });
      model.apply(move("t1", 1));
      expect(model.apply({ ...move("t1", 2), baseRevision: 0 })).toMatchObject({ ok: true, revision: 2 });
      // …but a patch that no longer makes sense is still rejected.
      model.apply({ type: "element.remove", id: "t1" });
      expect(model.apply({ ...move("t1", 3), baseRevision: 0 })).toMatchObject({ ok: false, rejection: { code: "not-found" } });
    });

    it("checks the base revision of every patch of a batch", () => {
      const model = createMapModel(forest());
      model.apply(move("t1", 1));
      expect(model.apply([move("t2", 1), { ...move("t2", 2), baseRevision: 0 }])).toMatchObject({
        ok: false,
        rejection: { code: "stale-revision", patchIndex: 1 },
      });
    });
  });

  describe("authority revisions", () => {
    it("lets an authority impose the next revision through the committer host", () => {
      let host: Parameters<ReturnType<typeof localCommitter>["attach"]>[0] | undefined;
      const committer = localCommitter();
      const attach = committer.attach.bind(committer);
      committer.attach = (value) => {
        host = value;
        attach(value);
      };
      const model = createMapModel(forest(), { committer, revision: 10 });

      expect(host!.integrate([move("t1", 1)], { origin: "remote", revision: 11 })).toMatchObject({ ok: true, revision: 11 });
      expect(model.revision).toBe(11);
      expect(host!.integrate([move("t1", 2)], { origin: "remote", revision: 13 })).toMatchObject({
        ok: false,
        rejection: { code: "revision-gap" },
      });
      expect(model.revision).toBe(11);
    });
  });

  describe("subscribe", () => {
    it("notifies with the patches, their inverse, the origin and the new state", () => {
      const model = createMapModel(forest());
      const seen: MapChange[] = [];
      model.subscribe((change) => seen.push(change));
      model.apply(move("t1", 7));
      expect(seen).toHaveLength(1);
      expect(seen[0]).toMatchObject({ revision: 1, origin: "local", patches: [move("t1", 7)] });
      expect(seen[0]!.state).toBe(model.state);
      expect(seen[0]!.inverse).toEqual([move("t1", 128, 96)]);
    });

    it("does not notify on a rejection, and stops after unsubscribe", () => {
      const model = createMapModel(forest());
      const listener = vi.fn();
      const stop = model.subscribe(listener);
      model.apply(move("nope", 1));
      expect(listener).not.toHaveBeenCalled();
      stop();
      model.apply(move("t1", 1));
      expect(listener).not.toHaveBeenCalled();
    });

    it("isolates a failing listener from the others and from the apply result", () => {
      const onListenerError = vi.fn();
      const model = createMapModel(forest(), { onListenerError });
      const healthy = vi.fn();
      model.subscribe(() => {
        throw new Error("boom");
      });
      model.subscribe(healthy);
      expect(model.apply(move("t1", 1)).ok).toBe(true);
      expect(healthy).toHaveBeenCalledOnce();
      expect(onListenerError).toHaveBeenCalledOnce();
    });

    it("lets a listener apply a follow-up change on the committed state", () => {
      const model = createMapModel(forest());
      model.subscribe((change) => {
        if (change.revision === 1) model.apply(move("t2", 99));
      });
      model.apply(move("t1", 1));
      expect(model.revision).toBe(2);
      expect(model.getElement("t2")?.x).toBe(99);
    });
  });

  describe("custom patch types (the extension seam)", () => {
    it("handles a patch type a feature registers", () => {
      const handlers = {
        "test.rename": {
          apply(state: ReturnType<typeof forest>, patch: { id: string; to: string }) {
            const index = state.elements.findIndex((e) => e.id === patch.id);
            if (index < 0) return patchFail("not-found", "no such element");
            const previous = state.elements[index]!;
            const elements = state.elements.map((e, i) => (i === index ? { ...e, id: patch.to } : e));
            return patchOk({ ...state, elements }, [{ type: "test.rename", id: patch.to, to: previous.id } as never]);
          },
        },
      };
      const model = createMapModel(forest(), { patchHandlers: [handlers as never] });
      const result = model.apply({ type: "test.rename", id: "t1", to: "oak" } as never);
      expect(result.ok).toBe(true);
      expect(model.getElement("oak")).toBeDefined();
      if (result.ok) expect(model.apply(result.inverse).ok).toBe(true);
      expect(model.getElement("t1")).toBeDefined();
    });

    it("refuses to replace a built-in handler", () => {
      expect(() =>
        createMapModel(forest(), { patchHandlers: [{ "element.move": { apply: () => patchFail("x", "y") } }] }),
      ).toThrow(/already handled/);
    });

    it("turns an exception thrown by a handler into a rejection", () => {
      const boom = { "test.boom": { apply: () => { throw new Error("handler bug"); } } };
      const model = createMapModel(forest(), { patchHandlers: [boom as never] });
      expect(model.apply({ type: "test.boom" } as never)).toMatchObject({
        ok: false,
        rejection: { code: "invalid-patch", message: "handler bug", patchIndex: 0 },
      });
      expect(model.revision).toBe(0);
    });
  });
});
