// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import type { MapPatch } from "../model/patches";
import { assets, authority, catalog, session, world } from "./__fixtures__";
import { createMapAuthority, restoreMapAuthority, type MapAuthorityOptions, type PersistOptions } from "./authority";
import { MapStoreCorruptError, memoryMapStore, type MapStore } from "./store";

const move = (x: number): MapPatch => ({ type: "element.move", id: "t1", x, y: 0 });

/** A clock and a timer that only move when the test says so. */
function fakeTime() {
  const timers = new Map<number, () => void>();
  let next = 1;
  return {
    schedule: (run: () => void) => {
      const id = next++;
      timers.set(id, run);
      return () => void timers.delete(id);
    },
    pending: () => timers.size,
    fire: () => [...timers.values()].forEach((run) => run()),
    clear: () => timers.clear(),
  };
}

function setup(persist: Partial<PersistOptions> = {}, options: Partial<MapAuthorityOptions> = {}) {
  const store = memoryMapStore();
  const time = fakeTime();
  const a = createMapAuthority({
    definition: world(),
    assets,
    placement: { catalog },
    persist: { store, id: "world", schedule: time.schedule, ...persist },
    onError: (error) => {
      throw error;
    },
    ...options,
  });
  return { a, store, time };
}

describe("memoryMapStore", () => {
  it("returns nothing for an unknown map, and a copy of what it keeps", async () => {
    const store = memoryMapStore();
    expect(await store.load("x")).toBeUndefined();
    const definition = world();
    await store.save("x", { definition, revision: 3 });
    const loaded = (await store.load("x"))!;
    expect(loaded.snapshot.revision).toBe(3);
    expect(loaded.snapshot.definition).toEqual(definition);
    expect(loaded.snapshot.definition).not.toBe(definition);
  });

  it("keeps the changes made after the snapshot, and drops those the next snapshot covers", async () => {
    const store = memoryMapStore();
    await store.save("x", { definition: world(), revision: 0 });
    await store.append!("x", { revision: 1, patches: [move(1)] });
    await store.append!("x", { revision: 2, patches: [move(2)] });
    expect((await store.load("x"))!.patches.map((entry) => entry.revision)).toEqual([1, 2]);
    await store.save("x", { definition: world(), revision: 1 });
    expect((await store.load("x"))!.patches.map((entry) => entry.revision)).toEqual([2]);
  });

  it("cannot append to a map that has no snapshot", async () => {
    await expect(memoryMapStore().append!("x", { revision: 1, patches: [] })).rejects.toThrow(/no snapshot yet/);
  });
});

describe("saving", () => {
  it("writes a snapshot a little after the last change, so a burst of changes is one write", async () => {
    const { a, store, time } = setup({ snapshotEvery: 1000 });
    a.apply(move(1));
    a.apply(move(2));
    a.apply(move(3));
    expect(time.pending()).toBe(1); // each change pushes the write back: one timer
    expect(store.maps.get("world")).toBeUndefined();
    time.fire();
    await a.flush();
    expect(store.maps.get("world")!.snapshot.revision).toBe(3);
  });

  it("writes a snapshot at once every so many revisions, without waiting", async () => {
    const { a, store, time } = setup({ snapshotEvery: 3 });
    a.apply(move(1));
    a.apply(move(2));
    await a.flush();
    expect(store.maps.get("world")!.snapshot.revision).toBe(2); // flush forced it
    a.apply(move(3));
    a.apply(move(4));
    a.apply(move(5)); // 3 since the last snapshot
    await a.flush();
    expect(store.maps.get("world")!.snapshot.revision).toBe(5);
    expect(time.pending()).toBe(0);
  });

  it("records every change as it happens, when the store can", async () => {
    const { a, store } = setup({ snapshotEvery: 1000 });
    await store.save("world", { definition: world(), revision: 0 });
    a.apply(move(1));
    a.apply(move(2));
    await a.flush();
    // flush wrote a snapshot, which covers what was appended; before it, both were in the log
    expect(store.maps.get("world")!.snapshot.revision).toBe(2);
    expect(store.maps.get("world")!.patches).toEqual([]);
  });

  it("keeps the log when it is not asked to write a snapshot", async () => {
    const store = memoryMapStore();
    await store.save("world", { definition: world(), revision: 0 });
    const a = createMapAuthority({ definition: world(), assets, persist: { store, id: "world", snapshotEvery: 1000, schedule: () => () => undefined } });
    a.apply(move(1));
    a.apply(move(2));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect((await store.load("world"))!.patches.map((entry) => entry.revision)).toEqual([1, 2]);
  });

  it("writes in order, so a later snapshot never lands before an earlier one", async () => {
    const written: number[] = [];
    const store: MapStore = {
      load: async () => undefined,
      save: async (_id, snapshot) => {
        await new Promise((resolve) => setTimeout(resolve, snapshot.revision === 1 ? 20 : 0));
        written.push(snapshot.revision);
      },
    };
    const a = createMapAuthority({ definition: world(), assets, persist: { store, id: "w", snapshotEvery: 1 } });
    a.apply(move(1));
    a.apply(move(2));
    a.apply(move(3));
    await a.flush();
    expect(written).toEqual([0, 1, 2, 3]); // the starting snapshot first
  });

  it("flush writes what is pending right now, and does nothing when everything is saved", async () => {
    const { a, store, time } = setup();
    await a.flush();
    expect(store.maps.get("world")!.snapshot.revision).toBe(0); // only the starting snapshot
    a.apply(move(1));
    await a.flush();
    expect(store.maps.get("world")!.snapshot.revision).toBe(1);
    expect(time.pending()).toBe(0);
    const save = vi.spyOn(store, "save");
    await a.flush();
    expect(save).not.toHaveBeenCalled();
  });

  it("destroy writes what is pending before it stops", async () => {
    const { a, store } = setup();
    a.apply(move(1));
    await a.destroy();
    expect(store.maps.get("world")!.snapshot.revision).toBe(1);
  });

  it("a store that fails is reported, not thrown: the map goes on, and the next write is tried", async () => {
    const onError = vi.fn();
    let fail = true;
    const store: MapStore = {
      load: async () => undefined,
      save: async () => {
        if (fail) throw new Error("disk full");
      },
    };
    const ann = session("ann");
    const a = createMapAuthority({ definition: world(), assets, persist: { store, id: "w", snapshotEvery: 1 }, onError });
    a.connect(ann);
    expect(a.apply(move(1)).ok).toBe(true);
    await a.flush();
    expect(onError).toHaveBeenCalledTimes(2); // the starting snapshot, then this one
    expect(String(onError.mock.calls[0]![0])).toMatch(/disk full/);
    expect(ann.of("patches")).toHaveLength(1); // clients heard about it all the same

    fail = false;
    a.apply(move(2));
    await a.flush();
    expect(onError).toHaveBeenCalledTimes(2); // the next write went through
  });

  it("writes the starting snapshot first when it is not told the store has one, so the log has a base", async () => {
    const store = memoryMapStore();
    const a = createMapAuthority({ definition: world(), assets, persist: { store, id: "w", snapshotEvery: 1000, schedule: () => () => undefined } });
    a.apply(move(1));
    await new Promise((resolve) => setTimeout(resolve, 0));
    const stored = (await store.load("w"))!;
    expect(stored.snapshot.revision).toBe(0);
    expect(stored.patches.map((entry) => entry.revision)).toEqual([1]);
  });

  it("does nothing without a store", async () => {
    const a = authority();
    a.apply(move(1));
    await expect(a.flush()).resolves.toBeUndefined();
  });
});

describe("restoring", () => {
  it("starts a map that was never saved from the definition it is given, and saves it first", async () => {
    const store = memoryMapStore();
    const a = await restoreMapAuthority({ definition: world(), assets, persist: { store, id: "world" } });
    expect(a.revision).toBe(0);
    expect(store.maps.get("world")!.snapshot.revision).toBe(0);
  });

  it("brings back the last snapshot and the changes made after it", async () => {
    const store = memoryMapStore();
    const first = await restoreMapAuthority({ definition: world(), assets, placement: { catalog }, persist: { store, id: "world", snapshotEvery: 2, schedule: () => () => undefined } });
    first.apply(move(1));
    first.apply(move(2)); // snapshot at 2
    first.apply({ type: "element.add", element: { id: "n", kind: "tree", x: 9, y: 9 } }); // only in the log
    first.apply({ type: "element.remove", id: "t2" });
    await first.flush(); // wrote a snapshot: make the log the interesting part
    const log = memoryMapStore();
    await log.save("world", { definition: world(), revision: 0 });
    for (const [revision, patches] of [
      [1, [move(1)]],
      [2, [move(2)]],
      [3, [{ type: "element.add", element: { id: "n", kind: "tree", x: 9, y: 9 } } as MapPatch]],
      [4, [{ type: "element.remove", id: "t2" } as MapPatch]],
    ] as const) await log.append!("world", { revision, patches });

    const second = await restoreMapAuthority({ definition: world(), assets, persist: { store: log, id: "world" } });
    expect(second.revision).toBe(4);
    expect(second.model.getElement("t1")?.x).toBe(2);
    expect(second.model.getElement("n")).toBeDefined();
    expect(second.model.getElement("t2")).toBeUndefined();
  });

  it("continues from the restored revision: a client that was up to date only gets what is new", async () => {
    const store = memoryMapStore();
    await store.save("world", { definition: world(), revision: 10 });
    const a = await restoreMapAuthority({ definition: world(), assets, persist: { store, id: "world" } });
    expect(a.revision).toBe(10);
    const ann = session("ann");
    const connection = a.connect(ann);
    ann.inbox.length = 0;
    connection.receive({ type: "sync", since: 10 });
    expect(ann.inbox).toEqual([{ type: "synced", revision: 10 }]);
    a.apply(move(5));
    expect(ann.of("patches")[0]).toMatchObject({ revision: 11 });
  });

  it("does not broadcast, nor log, nor save again what it replays", async () => {
    const store = memoryMapStore();
    await store.save("world", { definition: world(), revision: 0 });
    await store.append!("world", { revision: 1, patches: [move(1)] });
    const save = vi.spyOn(store, "save");
    const append = vi.spyOn(store, "append");
    const a = await restoreMapAuthority({ definition: world(), assets, persist: { store, id: "world", schedule: () => () => undefined } });
    expect(save).not.toHaveBeenCalled();
    expect(append).not.toHaveBeenCalled();
    const ann = session("ann");
    a.connect(ann).receive({ type: "sync", since: 0 });
    // what was replayed is not in the log of changes to send: a client behind gets the map itself
    expect(ann.of("patches")).toEqual([]);
    expect(ann.of("snapshot")).toHaveLength(2); // the one on connecting, and the answer
  });

  it("refuses a log with a hole, rather than guess", async () => {
    const store = memoryMapStore();
    await store.save("world", { definition: world(), revision: 0 });
    await store.append!("world", { revision: 1, patches: [move(1)] });
    await store.append!("world", { revision: 3, patches: [move(3)] });
    await expect(restoreMapAuthority({ definition: world(), assets, persist: { store, id: "world" } })).rejects.toThrow(MapStoreCorruptError);
    await expect(restoreMapAuthority({ definition: world(), assets, persist: { store, id: "world" } })).rejects.toThrow(/Expected revision 2, found 3/);
  });

  it("refuses a log whose change cannot be replayed", async () => {
    const store = memoryMapStore();
    await store.save("world", { definition: world(), revision: 0 });
    await store.append!("world", { revision: 1, patches: [{ type: "element.remove", id: "ghost" }] });
    await expect(restoreMapAuthority({ definition: world(), assets, persist: { store, id: "world" } })).rejects.toThrow(/Revision 1 cannot be replayed/);
  });

  it("two maps in one store do not mix", async () => {
    const store = memoryMapStore();
    const a = await restoreMapAuthority({ definition: world(), assets, persist: { store, id: "a", snapshotEvery: 1 } });
    const b = await restoreMapAuthority({ definition: world(), assets, persist: { store, id: "b", snapshotEvery: 1 } });
    a.apply(move(1));
    await a.flush();
    expect(store.maps.get("a")!.snapshot.revision).toBe(1);
    expect(store.maps.get("b")!.snapshot.revision).toBe(0);
    void b;
  });
});
