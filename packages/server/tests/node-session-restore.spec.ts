// @vitest-environment node
import { describe, expect, test, vi } from "vitest";
import { reconcileRestoredRoom } from "../src/node/session-restore";
import { createMemoryNodeRoomStorage, createRpgServerTransport } from "../src/node";

const NOW = 1_000_000;

const storageWith = async (entries: Record<string, unknown>) => {
  const storage = await createMemoryNodeRoomStorage().getStorage("rooms", "map-test");
  await storage.put(entries);
  return storage;
};

const session = (publicId: string, extra: Record<string, unknown> = {}) => ({ publicId, created: 1, connected: true, ...extra });

describe("reconcileRestoredRoom", () => {
  test("a session still marked connected starts its reconnect window now: nobody is connected in a new process", async () => {
    const storage = await storageWith({ "session:p1": session("A") });
    const report = await reconcileRestoredRoom({ storage, now: () => NOW });
    expect(report.sessionsDisconnected).toEqual(["p1"]);
    expect(await storage.get("session:p1")).toMatchObject({ publicId: "A", connected: false, disconnectedAt: NOW });
  });

  test("keeps the rest of the session: the player and the creation date stay what they were", async () => {
    const storage = await storageWith({ "session:p1": session("A", { created: 42, locale: "fr" }) });
    await reconcileRestoredRoom({ storage, now: () => NOW });
    expect(await storage.get("session:p1")).toEqual({ publicId: "A", created: 42, locale: "fr", connected: false, disconnectedAt: NOW });
  });

  test("leaves a session that was already disconnected with its date: its window is not extended", async () => {
    const storage = await storageWith({ "session:p1": session("A", { connected: false, disconnectedAt: 500 }) });
    const report = await reconcileRestoredRoom({ storage, now: () => NOW });
    expect(report.sessionsDisconnected).toEqual([]);
    expect(await storage.get("session:p1")).toMatchObject({ connected: false, disconnectedAt: 500 });
  });

  test("gives a date to a disconnected session that has none: it could never expire otherwise", async () => {
    const storage = await storageWith({ "session:p1": session("A", { connected: false }) });
    await reconcileRestoredRoom({ storage, now: () => NOW });
    expect(await storage.get("session:p1")).toMatchObject({ connected: false, disconnectedAt: NOW });
  });

  test("discards the players that have no session, and keeps those that have one", async () => {
    const storage = await storageWith({
      "session:p1": session("A"),
      "session:p2": session("B", { connected: false, disconnectedAt: 10 }),
    });
    const players: Record<string, unknown> = { A: { id: "A" }, B: { id: "B" }, ghost: { id: "ghost" }, ghost2: { id: "ghost2" } };
    const report = await reconcileRestoredRoom({ storage, players, now: () => NOW });
    expect(report.playersDiscarded.sort()).toEqual(["ghost", "ghost2"]);
    expect(Object.keys(players).sort()).toEqual(["A", "B"]);
  });

  test("two connections of the same player keep that player", async () => {
    const storage = await storageWith({ "session:p1": session("A"), "session:p2": session("A", { connected: false, disconnectedAt: 1 }) });
    const players: Record<string, unknown> = { A: {} };
    await reconcileRestoredRoom({ storage, players, now: () => NOW });
    expect(Object.keys(players)).toEqual(["A"]);
  });

  test("a room without any session discards every player, and one without players is fine", async () => {
    const storage = await storageWith({ "state:something": { a: 1 } });
    const players: Record<string, unknown> = { A: {}, B: {} };
    expect((await reconcileRestoredRoom({ storage, players })).playersDiscarded.sort()).toEqual(["A", "B"]);
    expect(players).toEqual({});
    expect(await reconcileRestoredRoom({ storage })).toEqual({ sessionsDisconnected: [], playersDiscarded: [] });
  });

  test("does not touch what is not a session", async () => {
    const storage = await storageWith({ "session:p1": session("A"), "state:players": { A: 1 }, "session-public:A": ["p1"], "transfer:abc": { x: 1 } });
    await reconcileRestoredRoom({ storage, now: () => NOW });
    expect(await storage.get("state:players")).toEqual({ A: 1 });
    expect(await storage.get("session-public:A")).toEqual(["p1"]);
    expect(await storage.get("transfer:abc")).toEqual({ x: 1 });
  });

  test("ignores a damaged session instead of failing the whole restoration", async () => {
    const storage = await storageWith({ "session:p1": null, "session:p2": "oops", "session:p3": session("A") });
    const players: Record<string, unknown> = { A: {}, B: {} };
    const report = await reconcileRestoredRoom({ storage, players, now: () => NOW });
    expect(report.sessionsDisconnected).toEqual(["p3"]);
    expect(Object.keys(players)).toEqual(["A"]);
  });

  test("a second pass changes nothing", async () => {
    const storage = await storageWith({ "session:p1": session("A") });
    const players: Record<string, unknown> = { A: {}, ghost: {} };
    await reconcileRestoredRoom({ storage, players, now: () => NOW });
    const again = await reconcileRestoredRoom({ storage, players, now: () => NOW + 5000 });
    expect(again).toEqual({ sessionsDisconnected: [], playersDiscarded: [] });
    expect(await storage.get("session:p1")).toMatchObject({ disconnectedAt: NOW });
  });
});

describe("the Node transport restores a room", () => {
  const request = { url: "/parties/main/map-test", headers: { host: "localhost" } };

  /** A room whose storage already holds a connected session, and two players: one with that session, one without. */
  const hostedRoom = (options: { hibernate?: boolean; window?: number } = {}) => {
    const players: Record<string, unknown> = { A: { id: "A" }, ghost: { id: "ghost" } };
    const collected = vi.fn(async () => undefined);
    let storage: { get: (key: string) => Promise<unknown> } | undefined;

    class StubServer {
      isHibernate = options.hibernate ?? false;
      subRoom?: { players: () => Record<string, unknown>; sessionExpiryTime: number };
      garbageCollector = collected;
      constructor(public room: { storage: typeof storage & { put: (entries: Record<string, unknown>) => Promise<void> } }) {}
      async onStart() {
        storage = this.room.storage;
        await this.room.storage.put({ "session:p1": { publicId: "A", created: 1, connected: true } });
        this.subRoom = { players: () => players, sessionExpiryTime: options.window ?? 50 };
      }
    }
    const transport = createRpgServerTransport(StubServer as never, { initializeMaps: false });
    const open = async () => {
      const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
      vi.spyOn(console, "error").mockImplementation(() => undefined);
      await transport.acceptWebSocket({ close: vi.fn() } as never, request);
      return log;
    };
    return { players, collected, open, session: () => storage!.get("session:p1") };
  };

  test("gives the session its reconnect window, drops the player nobody can claim, and says so", async () => {
    const room = hostedRoom();
    const log = await room.open();
    expect(await room.session()).toMatchObject({ publicId: "A", connected: false });
    expect(typeof ((await room.session()) as { disconnectedAt?: unknown }).disconnectedAt).toBe("number");
    expect(Object.keys(room.players)).toEqual(["A"]);
    expect(log.mock.calls.map((call) => String(call[0])).some((line) => line.includes("restored: 1 session(s)") && line.includes("1 player(s) without a session"))).toBe(true);
  });

  test("collects the sessions again when their window ends, even if nobody connects", async () => {
    const room = hostedRoom({ window: 40 });
    await room.open();
    expect(room.collected).not.toHaveBeenCalled();
    await new Promise((resolve) => setTimeout(resolve, 400));
    expect(room.collected).toHaveBeenCalledWith({ sessionExpiryTime: 40 });
  });

  test("leaves a room alone when its connections survive the process (hibernation)", async () => {
    const room = hostedRoom({ hibernate: true });
    await room.open();
    expect(await room.session()).toMatchObject({ connected: true });
    expect(Object.keys(room.players).sort()).toEqual(["A", "ghost"]);
  });
});
