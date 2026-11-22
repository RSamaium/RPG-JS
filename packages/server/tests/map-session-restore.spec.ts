// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { createServer, provideServerModules } from "../src";
import { createMemoryNodeRoomStorage, createRpgServerTransport } from "../src/node";

/**
 * A map room woken from storage must rebuild its map, and therefore its
 * database, before it resolves the snapshot of a player transferred to it.
 * See https://github.com/RSamaium/RPG-JS/issues/503
 */
describe("a map room restored after a restart", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  const GameServer = createServer({
    providers: [
      provideServerModules([
        {
          database(map: any) {
            const published = map.data()?.database;
            if (!Array.isArray(published)) return published ?? {};
            return Object.fromEntries(published.map((record: any) => [
              record._id,
              { id: record._id, name: record.name },
            ]));
          },
        },
      ]),
    ],
  });

  /** Publish a map holding a skill, then start a new transport from the storage snapshot. */
  const restartedTransport = async () => {
    const storage = createMemoryNodeRoomStorage();
    const first = createRpgServerTransport(GameServer as any, { initializeMaps: false, storage });
    const published = await first.updateMap("skill-map", {
      id: "skill-map",
      width: 320,
      height: 240,
      events: [{ name: "statue", x: 10, y: 20 }],
      database: [{ _id: "slash", name: "Slash" }],
    });
    expect(published.status).toBe(200);

    const restoredStorage = createMemoryNodeRoomStorage({ snapshot: storage.snapshot() });
    return createRpgServerTransport(GameServer as any, { initializeMaps: false, storage: restoredStorage });
  };

  const transfer = (transport: any, publicId: string) =>
    transport.fetch("http://localhost/parties/main/map-skill-map/session-transfer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        privateId: `private-${publicId}`,
        publicId,
        sessionState: {},
        userSnapshot: { id: publicId, skills: ["slash"] },
      }),
    });

  const mapOf = (transport: any) => transport.getServer("map-skill-map").getCurrentRoom() as any;

  it("finds the map's database when it restores a player owning one of its records", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const transport = await restartedTransport();

    const response = await transfer(transport, "hero");

    expect(response.status).toBe(200);
    expect((await response.json()).transferToken).toEqual(expect.any(String));
    const hero = mapOf(transport).players()["hero"];
    expect(hero.skills().map((skill: any) => skill.id())).toEqual(["slash"]);
  });

  it("does not rebuild a running map when another player arrives", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const transport = await restartedTransport();
    expect((await transfer(transport, "hero")).status).toBe(200);

    const map = mapOf(transport);
    const updateMap = vi.spyOn(map, "updateMap");
    const response = await transfer(transport, "sidekick");

    expect(response.status).toBe(200);
    expect(updateMap).not.toHaveBeenCalled();
    expect(Object.keys(map.players()).sort()).toEqual(["hero", "sidekick"]);
  });
});
