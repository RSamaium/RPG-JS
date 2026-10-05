// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { createMapAuthority } from "../authority/authority";
import { memoryMapStore } from "../authority/store";
import type { MapIntent } from "../interaction/intents";
import { requireFree, snapToGrid, ownerOnly } from "../interaction/steps";
import type { ServerMessage } from "../protocol";
import { assets, catalog, client, newAuthority, settle, world } from "./__fixtures__";
import { connectInMemory } from "./memory-transport";
import { joinRemoteMap } from "./join";
import { remoteCommitter } from "./committer";

const move = (id: string, x: number, y: number): MapIntent => ({ type: "element.move", id, x, y });
const place = (x: number, y: number, catalogId = "oak"): MapIntent => ({ type: "element.place", catalogId, x, y });
const ids = (c: { model: { state: { elements: ReadonlyArray<{ id: string }> } } }) => c.model.state.elements.map((e) => e.id);

describe("joining", () => {
  it("gives the client the map as the authority has it, at the same revision", async () => {
    const a = newAuthority();
    a.apply({ type: "element.move", id: "t1", x: 7, y: 7 });
    const ann = await client(a);
    expect(ann.model.revision).toBe(1);
    expect(ann.model.getDefinition()).toEqual(a.model.getDefinition());
  });

  it("does not lose a change made while it was joining", async () => {
    const a = newAuthority();
    const connection = connectInMemory(a);
    a.apply({ type: "element.move", id: "t1", x: 7, y: 7 }); // right after connecting, before the client has the map
    const remote = await joinRemoteMap({ transport: connection.transport });
    await settle();
    expect(remote.model.revision).toBe(1);
    expect(remote.model.getElement("t1")?.x).toBe(7);
  });

  it("fails clearly when the authority never answers", async () => {
    const never = { send: () => undefined, onMessage: () => () => undefined };
    await expect(joinRemoteMap({ transport: never, timeoutMs: 5 })).rejects.toThrow(/did not send the map/);
  });

  it("is not confused by being sent the map twice", async () => {
    const a = newAuthority();
    const ann = await client(a);
    await settle(); // our `sync` got a second snapshot or a `synced`
    const reset = vi.fn();
    ann.model.subscribe((change) => change.reset && reset());
    ann.wire.emit({ type: "snapshot", revision: ann.model.revision, definition: a.model.getDefinition() });
    expect(reset).not.toHaveBeenCalled(); // the same revision is the same map
  });
});

describe("asking", () => {
  it("is answered when the authority has decided: the client's model then has the change, and so has everybody's", async () => {
    const a = newAuthority();
    const ann = await client(a);
    const bob = await client(a);

    const result = await ann.controller.submit(move("t1", 160, 96));
    expect(result).toMatchObject({ ok: true, revision: 1 });
    expect(ann.model.getElement("t1")).toMatchObject({ x: 160 });

    await settle();
    expect(bob.model.getElement("t1")).toMatchObject({ x: 160 });
    expect(bob.model.revision).toBe(1);
    expect(a.model.getElement("t1")).toMatchObject({ x: 160 });
  });

  it("sends intents, never patches", async () => {
    const a = newAuthority();
    const ann = await client(a);
    await ann.controller.submit(move("t1", 160, 96));
    const requests = ann.wire.sent.filter((m) => m.type !== "sync");
    expect(requests).toEqual([{ type: "intent", id: expect.any(String), intents: [move("t1", 160, 96)] }]);
  });

  it("does not change the client's model before the authority says so", async () => {
    const a = newAuthority();
    const ann = await client(a);
    ann.wire.hold(); // the request does not leave yet
    const pending = ann.controller.submit(move("t1", 160, 96)) as Promise<unknown>;
    await settle();
    expect(ann.model.getElement("t1")).toMatchObject({ x: 128 });
    ann.wire.release();
    await pending;
    expect(ann.model.getElement("t1")).toMatchObject({ x: 160 });
  });

  it("places things with an id the authority chooses, so two clients can never pick the same", async () => {
    const a = newAuthority();
    const ann = await client(a);
    const bob = await client(a);
    const [first, second] = await Promise.all([ann.controller.submit(place(400, 400)), bob.controller.submit(place(600, 500))]);
    expect(first).toMatchObject({ ok: true });
    expect(second).toMatchObject({ ok: true });
    await settle();
    expect(ids(ann)).toEqual(ids(bob));
    expect(ids(ann)).toEqual(expect.arrayContaining(["oak-1", "oak-2"]));
    expect(ids(a)).toEqual(ids(ann));
  });

  it("is refused by the authority with its reason, and the client's model does not change", async () => {
    const a = newAuthority({ pipeline: { move: [requireFree()] } });
    const ann = await client(a); // a client with no rules of its own, or a modified one
    const result = await ann.controller.submit(move("t2", 128, 96));
    expect(result).toMatchObject({ ok: false, rejection: { code: "occupied" } });
    expect(ann.model.getElement("t2")).toMatchObject({ x: 256 });
    expect(ann.model.revision).toBe(0);
  });

  it("is refused by the client itself, without a round trip, when it has the same rules", async () => {
    const shared = [requireFree<"element.move">()];
    const a = newAuthority({ pipeline: { move: shared } });
    const ann = await client(a, { pipeline: { move: shared } });
    const sentBefore = ann.wire.sent.length;
    const result = ann.controller.submit(move("t2", 128, 96));
    expect(result).toMatchObject({ ok: false, rejection: { code: "occupied" } }); // synchronous: nothing was sent
    expect(ann.wire.sent).toHaveLength(sentBefore);
  });

  it("two clients going for the same spot: the first wins, the other is told it is taken, and both see the same map", async () => {
    const a = newAuthority({ placement: { catalog, pipeline: [snapToGrid(32), requireFree()] } });
    const ann = await client(a);
    const bob = await client(a);
    const [first, second] = await Promise.all([ann.controller.submit(place(402, 402)), bob.controller.submit(place(404, 406))]);
    expect(first).toMatchObject({ ok: true });
    expect(second).toMatchObject({ ok: false, rejection: { code: "occupied" } });
    await settle();
    expect(ids(ann)).toEqual(ids(bob));
    expect(ids(ann).filter((id) => id.startsWith("oak"))).toEqual(["oak-1"]);
  });

  it("is answered by the rules of the actor: another player cannot touch what is not theirs", async () => {
    const a = newAuthority({
      placement: { catalog, stamp: (who) => ({ owner: (who as { id: string }).id }) },
      pipeline: { move: [ownerOnly({ actor: (who) => (who as { id: string }).id })] },
    });
    const ann = await client(a, { actor: { id: "ann" } });
    const bob = await client(a, { actor: { id: "bob" } });
    await ann.controller.submit(place(400, 400));
    await settle();
    expect(await bob.controller.submit(move("oak-1", 1, 1))).toMatchObject({ ok: false, rejection: { code: "not-owner" } });
    expect(await ann.controller.submit(move("oak-1", 1, 1))).toMatchObject({ ok: true });
  });

  it("without intents (a direct patch), is refused: the client asks, it does not decide", async () => {
    const a = newAuthority();
    const ann = await client(a);
    const result = await ann.model.apply({ type: "element.remove", id: "t1" });
    expect(result).toMatchObject({ ok: false, rejection: { code: "patches-not-allowed" } });
    expect(a.model.getElement("t1")).toBeDefined();
  });
});

describe("history", () => {
  it("records what the client asked for, not what others did", async () => {
    const a = newAuthority();
    const ann = await client(a);
    const bob = await client(a);
    await ann.controller.submit(move("t1", 160, 96));
    await bob.controller.submit(move("t2", 300, 300));
    await settle();
    expect(ann.model.history.status.undoDepth).toBe(1);
    expect(bob.model.history.status.undoDepth).toBe(1);
  });

  it("can undo for a client the authority trusts, and everybody sees it", async () => {
    const a = newAuthority({ trustPatches: (who) => (who as { admin?: boolean }).admin === true });
    const gm = await client(a, { actor: { admin: true } });
    const bob = await client(a);
    await gm.controller.submit(place(400, 400));
    await settle();
    expect(ids(bob)).toContain("oak-1");

    const undone = await gm.model.history.undo();
    expect(undone).toMatchObject({ ok: true });
    expect(ids(gm)).not.toContain("oak-1");
    await settle();
    expect(ids(bob)).not.toContain("oak-1");
    expect(gm.model.history.status).toMatchObject({ undoDepth: 0, redoDepth: 1 });

    expect(await gm.model.history.redo()).toMatchObject({ ok: true });
    await settle();
    expect(ids(bob)).toContain("oak-1");
  });

  it("cannot undo for a client the authority does not trust: the change stays, and so does the history", async () => {
    const a = newAuthority();
    const ann = await client(a);
    await ann.controller.submit(move("t1", 160, 96));
    const undone = await ann.model.history.undo();
    expect(undone).toMatchObject({ ok: false, rejection: { code: "patches-not-allowed" } });
    expect(ann.model.getElement("t1")).toMatchObject({ x: 160 });
    expect(ann.model.history.status.undoDepth).toBe(1);
  });
});

describe("catching up", () => {
  it("a client that joins late gets the map with everything that happened", async () => {
    const a = newAuthority();
    const ann = await client(a);
    await ann.controller.submit(place(400, 400));
    await ann.controller.submit(move("t1", 160, 96));
    const late = await client(a);
    expect(late.model.getDefinition()).toEqual(a.model.getDefinition());
    expect(late.model.revision).toBe(2);
  });

  it("a client that missed one change notices the hole in the revisions and asks again", async () => {
    const a = newAuthority();
    const ann = await client(a);
    const bob = await client(a);
    bob.wire.drop((m) => m.type === "patches" && m.revision === 1); // bob never hears about revision 1

    await ann.controller.submit(move("t1", 160, 96)); // revision 1: lost for bob
    await settle();
    expect(bob.model.revision).toBe(0);

    bob.wire.drop(() => false);
    await ann.controller.submit(move("t2", 300, 300)); // revision 2: bob sees the hole
    await settle();
    expect(bob.model.revision).toBe(2);
    expect(bob.model.getDefinition()).toEqual(a.model.getDefinition());
    const syncs = bob.wire.sent.filter((m) => m.type === "sync");
    expect(syncs.at(-1)).toEqual({ type: "sync", since: 0 }); // it said what it had
  });

  it("asks for the missing changes only once while it waits, not at every message", async () => {
    const a = newAuthority();
    const ann = await client(a);
    const bob = await client(a);
    bob.wire.drop((m) => m.type === "patches" && m.revision <= 1);
    await ann.controller.submit(move("t1", 1, 1));
    bob.wire.drop((m) => m.type === "patches" && m.revision <= 1);
    const before = bob.wire.sent.filter((m) => m.type === "sync").length;
    bob.wire.emit({ type: "patches", revision: 5, patches: [] });
    bob.wire.emit({ type: "patches", revision: 6, patches: [] });
    bob.wire.emit({ type: "patches", revision: 7, patches: [] });
    expect(bob.wire.sent.filter((m) => m.type === "sync").length - before).toBe(1);
  });

  it("gets the whole map back when it is too far behind", async () => {
    const a = newAuthority({ log: 1 });
    const ann = await client(a);
    const bob = await client(a);
    bob.wire.drop((m) => m.type === "patches");
    for (let i = 1; i <= 4; i++) await ann.controller.submit(move("t1", i, i));
    bob.wire.drop(() => false);
    await ann.controller.submit(move("t1", 9, 9));
    await settle();
    expect(bob.model.getDefinition()).toEqual(a.model.getDefinition());
    expect(bob.model.revision).toBe(5);
  });

  it("ignores a change it already has, whether repeated or old", async () => {
    const a = newAuthority();
    const ann = await client(a);
    const bob = await client(a);
    await settle();
    const syncsBefore = bob.wire.sent.filter((m) => m.type === "sync").length;
    bob.wire.duplicate(); // everything arrives twice
    await ann.controller.submit(move("t1", 160, 96));
    await ann.controller.submit(move("t1", 200, 96));
    await settle();
    expect(bob.model.revision).toBe(2);
    expect(bob.model.getElement("t1")?.x).toBe(200);
    // a repeat is a repeat, not a reason to ask the authority again
    expect(bob.wire.sent.filter((m) => m.type === "sync")).toHaveLength(syncsBefore);
  });

  it("starts again from the map when a change does not fit its own", async () => {
    const a = newAuthority();
    const ann = await client(a);
    await settle();
    const syncs = () => ann.wire.sent.filter((m) => m.type === "sync");
    const before = syncs().length;
    ann.wire.emit({ type: "patches", revision: 1, patches: [{ type: "element.remove", id: "ghost" }] }); // cannot apply
    await settle();
    expect(syncs()).toHaveLength(before + 1);
    expect(syncs().at(-1)).toEqual({ type: "sync" }); // asks for the whole map, not just what follows
  });

  it("follows the authority back when it is behind the client, e.g. after a restart from older data", async () => {
    const a = newAuthority();
    const ann = await client(a);
    ann.wire.emit({ type: "snapshot", revision: 5, definition: { ...a.model.getDefinition(), elements: [] } });
    expect(ann.model.revision).toBe(5);
    expect(ann.model.state.elements).toEqual([]);
    // the map the authority really has comes with the next sync
    const older = createMapAuthority({ definition: world(), assets, revision: 2 });
    ann.wire.emit(older.snapshot());
    expect(ann.model.revision).toBe(2);
    expect(ann.model.state.elements).toHaveLength(3);
  });

  it("forgets the history of the map it replaced, whose changes would not make sense", async () => {
    const a = newAuthority();
    const ann = await client(a);
    await ann.controller.submit(move("t1", 160, 96));
    expect(ann.model.history.canUndo).toBe(true);
    ann.wire.emit({ type: "snapshot", revision: 9, definition: a.model.getDefinition() });
    expect(ann.model.history.canUndo).toBe(false);
  });
});

describe("waiting", () => {
  it("gives up on a request the authority does not answer, and says so", async () => {
    const a = newAuthority();
    const timers: Array<() => void> = [];
    const ann = await client(a, { schedule: (run) => (timers.push(run), () => undefined) });
    ann.wire.hold(); // the request never reaches the authority
    const pending = ann.controller.submit(move("t1", 160, 96)) as Promise<unknown>;
    timers.forEach((run) => run());
    expect(await pending).toMatchObject({ ok: false, rejection: { code: "timeout" } });
    expect(ann.model.getElement("t1")).toMatchObject({ x: 128 });
  });

  it("still takes the change if it turns up after giving up, as one somebody else made", async () => {
    const a = newAuthority();
    const timers: Array<() => void> = [];
    const ann = await client(a, { schedule: (run) => (timers.push(run), () => undefined) });
    ann.wire.hold();
    const pending = ann.controller.submit(move("t1", 160, 96)) as Promise<unknown>;
    timers.forEach((run) => run());
    await pending;
    ann.wire.release(); // the authority gets it after all
    await settle();
    expect(ann.model.getElement("t1")).toMatchObject({ x: 160 });
    expect(ann.model.history.canUndo).toBe(false); // it was not recorded: the request had been given up
  });

  it("ends the requests that are waiting when it disconnects, and refuses new ones", async () => {
    const a = newAuthority();
    const ann = await client(a);
    ann.wire.hold();
    const pending = ann.controller.submit(move("t1", 160, 96)) as Promise<unknown>;
    ann.remote.disconnect();
    expect(await pending).toMatchObject({ ok: false, rejection: { code: "disconnected" } });
    expect(await ann.controller.submit(move("t1", 1, 1))).toMatchObject({ rejection: { code: "disconnected" } });
  });

  it("ends a request whose message could not be sent", async () => {
    const onError = vi.fn();
    const committer = remoteCommitter({
      transport: { send: () => { throw new Error("socket closed"); }, onMessage: () => () => undefined },
      onError,
    });
    const model = (await import("../model/model")).createMapModel(world(), { committer });
    expect(await model.apply({ type: "element.remove", id: "t1" }, { intents: [{ type: "element.remove", id: "t1" }] })).toMatchObject({
      ok: false,
      rejection: { code: "transport-error" },
    });
    expect(onError).toHaveBeenCalled();
  });
});

describe("what the game does itself", () => {
  it("a change made by the server, such as a lever, reaches every client", async () => {
    const a = newAuthority();
    const ann = await client(a);
    const bob = await client(a);
    a.apply([{ type: "element.remove", id: "t1" }, { type: "event.add", event: { id: "wood-1", kind: "loot", x: 128, y: 96, graphic: "wood" } }]);
    await settle();
    for (const c of [ann, bob]) {
      expect(c.model.getElement("t1")).toBeUndefined();
      expect(c.model.getEvent("wood-1")).toBeDefined();
      expect(c.model.revision).toBe(1);
      expect(c.model.history.canUndo).toBe(false); // not theirs to undo
    }
  });

  it("an effect shown by the server reaches every client, without touching the map", async () => {
    const a = newAuthority();
    const ann = await client(a);
    const bob = await client(a);
    const seen: Array<[string, unknown]> = [];
    bob.remote.committer.onEffect((effect) => void seen.push([effect.name, effect.target]));
    a.effect("t1", "shake", { intensity: 4 });
    await settle();
    expect(seen).toEqual([["shake", "t1"]]);
    expect(ann.model.revision).toBe(0);
  });

  it("selection that a change removes is dropped on the client that had it", async () => {
    const a = newAuthority();
    const ann = await client(a);
    ann.controller.state.update({ selection: [{ type: "element", id: "t1" }] });
    a.apply({ type: "element.remove", id: "t1" });
    await settle();
    expect(ann.controller.state.get().selection).toEqual([]);
  });
});

describe("restarting", () => {
  it("keeps the map, and a client that joins afterwards sees what was built before", async () => {
    const store = memoryMapStore();
    const options = { definition: world(), assets, placement: { catalog }, persist: { store, id: "world", snapshotEvery: 2 } };
    const first = createMapAuthority(options);
    const ann = await client(first);
    await ann.controller.submit(place(400, 400));
    await ann.controller.submit(place(600, 500));
    await ann.controller.submit(move("t1", 160, 96));
    await first.destroy();

    const { restoreMapAuthority } = await import("../authority/authority");
    const second = await restoreMapAuthority(options);
    const bob = await client(second);
    expect(ids(bob)).toEqual(expect.arrayContaining(["oak-1", "oak-2"]));
    expect(bob.model.getElement("t1")).toMatchObject({ x: 160 });
    expect(bob.model.revision).toBe(3);

    // numbering goes on where it stopped: ids are not reused after a restart
    await bob.controller.submit(place(300, 600));
    expect(second.model.getElement("oak-3")).toBeDefined();
  });
});

describe("messages the client may receive", () => {
  it("garbage from the wire is ignored: a client never acts on what it does not recognise", async () => {
    const a = newAuthority();
    const ann = await client(a);
    const garbage: unknown[] = [null, 3, "patches", { type: "patches" }, { type: "patches", revision: 1, patches: [3] }, { type: "snapshot", revision: 4 }, { type: "nope" }];
    for (const message of garbage) expect(() => ann.wire.emit(message as ServerMessage)).not.toThrow();
    expect(ann.model.revision).toBe(0);
    expect(ann.model.state.elements).toHaveLength(3);
  });
});
