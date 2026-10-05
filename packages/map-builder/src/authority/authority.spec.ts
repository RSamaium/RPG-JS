// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import type { MapIntent } from "../interaction/intents";
import { ownerOnly, rateLimit, requireFree, snapToGrid, protectedZone } from "../interaction/steps";
import { authority, catalog, session, type Player } from "./__fixtures__";
import { createMapAuthority } from "./authority";
import { assets, world } from "./__fixtures__";

const move = (id: string, x: number, y: number): MapIntent => ({ type: "element.move", id, x, y });
const place = (x: number, y: number, catalogId = "oak"): MapIntent => ({ type: "element.place", catalogId, x, y });
const ask = (id: string, ...intents: MapIntent[]) => ({ type: "intent", id, intents });
const idOf = (player: unknown) => (player as Player).id;

describe("connecting", () => {
  it("sends the map to a client as soon as it connects, without being asked", () => {
    const a = authority();
    const ann = session("ann");
    a.connect(ann);
    expect(ann.inbox).toHaveLength(1);
    expect(ann.inbox[0]).toMatchObject({ type: "snapshot", revision: 0 });
    expect((ann.inbox[0] as { definition: { id: string } }).definition.id).toBe("world");
  });

  it("counts the clients, and forgets one that leaves", () => {
    const a = authority();
    const first = a.connect(session("a"));
    a.connect(session("b"));
    expect(a.connections).toBe(2);
    first.disconnect();
    expect(a.connections).toBe(1);
  });

  it("ignores everything from a client that left", () => {
    const a = authority();
    const ann = session("ann");
    const connection = a.connect(ann);
    connection.disconnect();
    connection.receive(ask("r1", move("t1", 1, 1)));
    expect(a.model.revision).toBe(0);
    expect(ann.inbox).toHaveLength(1); // only the snapshot it got on connecting
  });

  it("does not let one broken client stop the others from hearing", () => {
    const onError = vi.fn();
    const a = authority({ onError });
    const broken = { id: "broken", actor: undefined, send: () => { throw new Error("socket closed"); } };
    const ann = session("ann");
    a.connect(broken);
    a.connect(ann);
    expect(onError).toHaveBeenCalled(); // the snapshot it could not send
    a.apply({ type: "element.move", id: "t1", x: 1, y: 1 });
    expect(ann.of("patches")).toHaveLength(1);
  });
});

describe("intents", () => {
  it("are decided by the authority, then told to everybody, the asker's request id included", () => {
    const a = authority();
    const ann = session("ann");
    const bob = session("bob");
    const connection = a.connect(ann);
    a.connect(bob);

    connection.receive(ask("r1", move("t1", 160, 96)));

    expect(a.model.getElement("t1")).toMatchObject({ x: 160, y: 96 });
    expect(ann.of("patches")).toEqual([{ type: "patches", revision: 1, patches: [{ type: "element.move", id: "t1", x: 160, y: 96 }], requestId: "r1" }]);
    // somebody else hears the change, but not whose request it was
    expect(bob.of("patches")).toEqual([{ type: "patches", revision: 1, patches: [{ type: "element.move", id: "t1", x: 160, y: 96 }] }]);
  });

  it("name the author in what is broadcast, when the game says how to name them", () => {
    const a = authority({ author: (who) => (who as Player).id });
    const bob = session("bob");
    a.connect(bob);
    a.connect(session("ann")).receive(ask("r1", move("t1", 1, 1)));
    expect(bob.of("patches")[0]).toMatchObject({ author: "ann" });
  });

  it("are refused by the pipeline with a reason, to the asker only, and change nothing", () => {
    const a = authority({ pipeline: { move: [requireFree()] } });
    const ann = session("ann");
    const bob = session("bob");
    const connection = a.connect(ann);
    a.connect(bob);

    connection.receive(ask("r1", move("t2", 128, 96))); // onto t1

    expect(ann.of("rejected")).toEqual([{ type: "rejected", id: "r1", reason: "occupied", message: "Something is already there", patchIndex: 0 }]);
    expect(bob.of("patches")).toEqual([]);
    expect(bob.of("rejected")).toEqual([]);
    expect(a.model.revision).toBe(0);
  });

  it("are applied together or not at all", () => {
    const a = authority({ pipeline: { move: [requireFree()] } });
    const ann = session("ann");
    const connection = a.connect(ann);
    // the second move lands on the house, which stays where it is
    connection.receive(ask("r1", move("t1", 500, 500), move("t2", 660, 330)));
    expect(ann.of("rejected")[0]).toMatchObject({ reason: "occupied", patchIndex: 1 });
    expect(a.model.getElement("t1")).toMatchObject({ x: 128, y: 96 });
    expect(a.model.revision).toBe(0);

    connection.receive(ask("r2", move("t1", 500, 500), move("t2", 600, 100)));
    expect(a.model.revision).toBe(1); // one revision for the batch
  });

  it("an intent nobody knows is refused", () => {
    const a = authority();
    const ann = session("ann");
    a.connect(ann).receive(ask("r1", { type: "tilling.till", x: 1, y: 1 } as never));
    expect(ann.of("rejected")[0]).toMatchObject({ id: "r1", reason: "unknown-intent" });
  });

  it("know the actor of the client that asks, so rules can tell players apart", () => {
    const a = authority({
      pipeline: { move: [ownerOnly({ actor: idOf })] },
    });
    a.apply({ type: "element.data", id: "t1", set: { owner: "ann" } });
    const ann = session("ann");
    const bob = session("bob");
    const asAnn = a.connect(ann);
    const asBob = a.connect(bob);

    asBob.receive(ask("r1", move("t1", 1, 1)));
    expect(bob.of("rejected")[0]).toMatchObject({ reason: "not-owner" });
    asAnn.receive(ask("r2", move("t1", 1, 1)));
    expect(ann.of("patches").at(-1)).toMatchObject({ requestId: "r2" });
  });

  it("are limited per client, and a flood by one does not slow the others", () => {
    const now = { t: 0 };
    const a = authority({ pipeline: { move: [rateLimit({ max: 2, windowMs: 1000, now: () => now.t })] } });
    const ann = session("ann");
    const bob = session("bob");
    const asAnn = a.connect(ann);
    const asBob = a.connect(bob);
    for (let i = 0; i < 5; i++) asAnn.receive(ask(`a${i}`, move("t1", i, i)));
    expect(ann.of("rejected").map((r) => r.reason)).toEqual(["rate-limit", "rate-limit", "rate-limit"]);
    asBob.receive(ask("b1", move("t2", 1, 1)));
    expect(bob.of("rejected")).toEqual([]);
  });

  it("can keep an area out of reach", () => {
    const a = authority({ pipeline: { move: [protectedZone([{ x: 100, y: 60, width: 120, height: 160 }])] } });
    const ann = session("ann");
    a.connect(ann).receive(ask("r1", move("t1", 500, 500)));
    expect(ann.of("rejected")[0]).toMatchObject({ reason: "protected-zone" });
  });

  it("two clients going for the same spot: the first wins, the second is told it is taken", () => {
    const a = authority({ placement: { catalog, pipeline: [snapToGrid(32), requireFree()] } });
    const ann = session("ann");
    const bob = session("bob");
    const asAnn = a.connect(ann);
    const asBob = a.connect(bob);

    asAnn.receive(ask("a1", place(400, 400)));
    asBob.receive(ask("b1", place(402, 404))); // the same cell of the grid

    expect(a.model.state.elements.filter((e) => e.kind === "tree").map((e) => e.id)).toEqual(["t1", "t2", "oak-1"]);
    expect(bob.of("rejected")[0]).toMatchObject({ id: "b1", reason: "occupied" });
    expect(ann.of("rejected")).toEqual([]);
  });
});

describe("placing", () => {
  it("gives the id of what is placed, numbered per item, never chosen by the client", () => {
    const a = authority();
    const ann = session("ann");
    const connection = a.connect(ann);
    connection.receive(ask("r1", place(400, 400)));
    connection.receive(ask("r2", place(500, 500)));
    connection.receive(ask("r3", place(300, 600, "cabin")));
    expect(a.model.state.elements.map((e) => e.id)).toEqual(["home", "t1", "t2", "oak-1", "oak-2", "cabin-1"]);
  });

  it("refuses an id that is already taken, instead of colliding silently", () => {
    const a = authority();
    const ann = session("ann");
    a.connect(ann).receive(ask("r1", { type: "element.place", catalogId: "oak", x: 1, y: 1, id: "t1" }));
    expect(ann.of("rejected")[0]).toMatchObject({ reason: "duplicate-id" });
  });

  it("stamps who placed it, so ownership can be enforced afterwards", () => {
    const a = authority({
      placement: { catalog, stamp: (who) => ({ owner: idOf(who) }) },
      pipeline: { move: [ownerOnly({ actor: idOf })] },
    });
    const ann = session("ann");
    const bob = session("bob");
    const asAnn = a.connect(ann);
    const asBob = a.connect(bob);
    asAnn.receive(ask("r1", place(400, 400)));
    expect(a.model.getElement("oak-1")?.data).toEqual({ owner: "ann" });
    asBob.receive(ask("r2", move("oak-1", 1, 1)));
    expect(bob.of("rejected")[0]).toMatchObject({ reason: "not-owner" });
    asAnn.receive(ask("r3", move("oak-1", 1, 1)));
    expect(a.model.getElement("oak-1")).toMatchObject({ x: 1 });
  });

  it("refuses a catalog item that does not exist", () => {
    const a = authority();
    const ann = session("ann");
    a.connect(ann).receive(ask("r1", place(1, 1, "dragon")));
    expect(ann.of("rejected")[0]).toMatchObject({ reason: "unknown-catalog-item" });
  });
});

describe("malformed messages", () => {
  it("are ignored: no answer, no change, no crash", () => {
    const a = authority();
    const ann = session("ann");
    const connection = a.connect(ann);
    for (const raw of [null, 3, "intent", {}, { type: "intent" }, { type: "intent", id: "r", intents: [] }, { type: "intent", id: "r", intents: [{ x: 1 }] }, { type: "ping" }]) {
      expect(() => connection.receive(raw)).not.toThrow();
    }
    expect(ann.inbox).toHaveLength(1); // only the snapshot
    expect(a.model.revision).toBe(0);
  });

  it("an intent with a wrong payload is refused, and nothing breaks", () => {
    const a = authority({ pipeline: { move: [snapToGrid(32)] } });
    const ann = session("ann");
    const connection = a.connect(ann);
    connection.receive(ask("r1", { type: "element.move", id: "t1", x: "far", y: 1 } as never));
    connection.receive(ask("r2", { type: "element.move", id: 3, x: 1, y: 1 } as never));
    connection.receive(ask("r3", { type: "element.place", catalogId: 3, x: 1, y: 1 } as never));
    expect(a.model.revision).toBe(0);
    expect(ann.of("rejected").map((r) => r.id)).toEqual(["r1", "r2", "r3"]);
  });
});

describe("patches from a client", () => {
  it("are refused unless the client is trusted, because a client asks and the authority decides", () => {
    const a = authority();
    const ann = session("ann");
    a.connect(ann).receive({ type: "patches", id: "u1", patches: [{ type: "element.remove", id: "t1" }] });
    expect(ann.of("rejected")[0]).toEqual({ type: "rejected", id: "u1", reason: "patches-not-allowed", message: "Only intents are accepted from this client" });
    expect(a.model.getElement("t1")).toBeDefined();
  });

  it("are applied for a trusted client, and told to everybody", () => {
    const a = authority({ trustPatches: (who) => (who as Player).admin === true });
    const gm = session("gm", { id: "gm", admin: true });
    const bob = session("bob");
    a.connect(bob);
    a.connect(gm).receive({ type: "patches", id: "u1", patches: [{ type: "element.remove", id: "t1" }] });
    expect(a.model.getElement("t1")).toBeUndefined();
    expect(gm.of("patches")[0]).toMatchObject({ requestId: "u1" });
    expect(bob.of("patches")[0]).not.toHaveProperty("requestId");
  });

  it("are still checked by the model, so a trusted client cannot corrupt the map", () => {
    const a = authority({ trustPatches: () => true });
    const gm = session("gm");
    a.connect(gm).receive({ type: "patches", id: "u1", patches: [{ type: "element.remove", id: "nope" }] });
    expect(gm.of("rejected")[0]).toMatchObject({ id: "u1", reason: "not-found" });
  });
});

describe("catching up", () => {
  const withHistory = (log = 512) => {
    const a = authority({ log });
    for (let i = 1; i <= 5; i++) a.apply({ type: "element.move", id: "t1", x: i, y: i });
    return a;
  };

  it("tells a client that is up to date, and sends nothing else", () => {
    const a = withHistory();
    const ann = session("ann");
    const connection = a.connect(ann);
    ann.inbox.length = 0;
    connection.receive({ type: "sync", since: 5 });
    expect(ann.inbox).toEqual([{ type: "synced", revision: 5 }]);
  });

  it("sends only the changes a client is missing, in order, then says it is done", () => {
    const a = withHistory();
    const ann = session("ann");
    const connection = a.connect(ann);
    ann.inbox.length = 0;
    connection.receive({ type: "sync", since: 3 });
    expect(ann.inbox.map((m) => m.type)).toEqual(["patches", "patches", "synced"]);
    expect(ann.of("patches").map((m) => m.revision)).toEqual([4, 5]);
  });

  it("sends the whole map when the client is too far behind for the log", () => {
    const a = withHistory(2); // keeps revisions 4 and 5
    const ann = session("ann");
    const connection = a.connect(ann);
    ann.inbox.length = 0;
    connection.receive({ type: "sync", since: 1 });
    expect(ann.inbox.map((m) => m.type)).toEqual(["snapshot"]);
    ann.inbox.length = 0;
    connection.receive({ type: "sync", since: 3 }); // 4 and 5 are in the log
    expect(ann.inbox.map((m) => m.type)).toEqual(["patches", "patches", "synced"]);
  });

  it("sends the whole map to a client with no revision, or one that is ahead of the authority", () => {
    const a = withHistory();
    const ann = session("ann");
    const connection = a.connect(ann);
    for (const since of [undefined, 99]) {
      ann.inbox.length = 0;
      connection.receive(since === undefined ? { type: "sync" } : { type: "sync", since });
      expect(ann.inbox.map((m) => m.type)).toEqual(["snapshot"]);
    }
  });

  it("sends the whole map when no log is kept", () => {
    const a = withHistory(0);
    const ann = session("ann");
    const connection = a.connect(ann);
    ann.inbox.length = 0;
    connection.receive({ type: "sync", since: 4 });
    expect(ann.inbox.map((m) => m.type)).toEqual(["snapshot"]);
  });

  it("the snapshot is the map as it is now", () => {
    const a = withHistory();
    const message = a.snapshot();
    expect(message).toMatchObject({ type: "snapshot", revision: 5 });
    expect((message as unknown as { definition: { elements: Array<{ id: string; x: number }> } }).definition.elements.find((e) => e.id === "t1")?.x).toBe(5);
  });
});

describe("what the game does itself", () => {
  it("apply changes the map and tells everybody, without a request id", () => {
    const a = authority();
    const ann = session("ann");
    a.connect(ann);
    expect(a.apply({ type: "element.remove", id: "t1" })).toMatchObject({ ok: true, revision: 1 });
    expect(ann.of("patches")[0]).toEqual({ type: "patches", revision: 1, patches: [{ type: "element.remove", id: "t1" }] });
  });

  it("apply reports a change that does not fit, and tells nobody", () => {
    const a = authority();
    const ann = session("ann");
    a.connect(ann);
    ann.inbox.length = 0;
    expect(a.apply({ type: "element.remove", id: "nope" }).ok).toBe(false);
    expect(ann.inbox).toEqual([]);
  });

  it("submit runs intents through the rules for an actor, such as a non-player character", () => {
    const a = authority({ pipeline: { move: [ownerOnly({ actor: idOf })] } });
    a.apply({ type: "element.data", id: "t1", set: { owner: "ann" } });
    expect(a.submit(move("t1", 1, 1), { id: "npc" })).toMatchObject({ ok: false, rejection: { code: "not-owner" } });
    expect(a.submit(move("t1", 1, 1), { id: "ann" }).ok).toBe(true);
  });

  it("effect shows something to everybody, and keeps nothing", () => {
    const a = authority();
    const ann = session("ann");
    const bob = session("bob");
    a.connect(ann);
    a.connect(bob);
    a.effect("t1", "shake", { intensity: 5 });
    a.effect({ type: "event", id: "chest-1" }, "blink");
    expect(ann.of("effect")).toEqual([
      { type: "effect", target: "t1", name: "shake", params: { intensity: 5 } },
      { type: "effect", target: { type: "event", id: "chest-1" }, name: "blink" },
    ]);
    expect(bob.of("effect")).toHaveLength(2);
    expect(a.model.revision).toBe(0);
  });

  it("tells whoever keeps the physics in step, after every change, whoever made it", () => {
    const changes: number[] = [];
    const a = authority({ onChange: (change) => void changes.push(change.revision) });
    a.apply({ type: "element.move", id: "t1", x: 1, y: 1 });
    a.connect(session("ann")).receive(ask("r1", move("t2", 2, 2)));
    expect(changes).toEqual([1, 2]);
  });

  it("does not let a failing observer stop the broadcast", () => {
    const onError = vi.fn();
    const a = authority({ onChange: () => { throw new Error("physics broke"); }, onError });
    const ann = session("ann");
    a.connect(ann);
    a.apply({ type: "element.move", id: "t1", x: 1, y: 1 });
    expect(onError).toHaveBeenCalledOnce();
    expect(ann.of("patches")).toHaveLength(1);
  });

  it("can start at a given revision, e.g. after a restart", () => {
    const a = createMapAuthority({ definition: world(), assets, revision: 40 });
    expect(a.revision).toBe(40);
    const ann = session("ann");
    a.connect(ann);
    expect(ann.inbox[0]).toMatchObject({ type: "snapshot", revision: 40 });
  });
});

describe("custom intents", () => {
  it("can be added by a feature, with their own rules", () => {
    const a = authority({
      setup(controller) {
        controller.registerIntent("tilling.till" as never, { resolve: (intent: { x: number; y: number }) => ({ type: "extension.set", id: "soil", value: { x: intent.x, y: intent.y } }) } as never);
      },
    });
    const ann = session("ann");
    a.connect(ann).receive(ask("r1", { type: "tilling.till", x: 3, y: 4 } as never));
    expect(a.model.state.extensions?.soil).toEqual({ x: 3, y: 4 });
  });
});

describe("destroy", () => {
  it("stops answering, and is harmless twice", async () => {
    const a = authority();
    const ann = session("ann");
    const connection = a.connect(ann);
    await a.destroy();
    await a.destroy();
    ann.inbox.length = 0;
    connection.receive(ask("r1", move("t1", 1, 1)));
    expect(ann.inbox).toEqual([]);
    expect(a.model.revision).toBe(0);
  });
});
