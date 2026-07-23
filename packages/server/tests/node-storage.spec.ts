import { afterEach, describe, expect, test } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  createMemoryNodeRoomStorage,
  createSqliteNodeRoomStorage,
} from "../src/node";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) =>
      rm(directory, { recursive: true, force: true })
    ),
  );
});

describe("RPGJS Node room storage providers", () => {
  test("memory storage isolates rooms and restores a snapshot", async () => {
    const provider = createMemoryNodeRoomStorage();
    const lobby = await provider.getStorage("main", "lobby-1");
    const map = await provider.getStorage("main", "map-town");

    await lobby.put("session:one", { publicId: "hero" });
    await lobby.put({
      "session:two": { publicId: "mage" },
      metadata: { version: 1 },
    });
    await map.put("session:one", { publicId: "other-room" });

    expect(await lobby.list({ prefix: "session:" })).toEqual(new Map([
      ["session:one", { publicId: "hero" }],
      ["session:two", { publicId: "mage" }],
    ]));
    expect(await map.get("session:one")).toEqual({ publicId: "other-room" });

    const snapshot = provider.snapshot();
    provider.clear();
    expect(await (await provider.getStorage("main", "lobby-1")).list()).toEqual(new Map());

    provider.restore(snapshot);
    const restoredLobby = await provider.getStorage("main", "lobby-1");
    const restoredMap = await provider.getStorage("main", "map-town");

    expect(await restoredLobby.get("metadata")).toEqual({ version: 1 });
    expect(await restoredMap.get("session:one")).toEqual({ publicId: "other-room" });
    expect(await restoredLobby.delete(["session:one", "session:two"])).toBe(2);
    expect(await restoredLobby.list({ prefix: "session:" })).toEqual(new Map());
  });

  test("SQLite storage persists values across provider instances", async () => {
    const directory = await mkdtemp(join(tmpdir(), "rpgjs-room-storage-"));
    temporaryDirectories.push(directory);
    const databasePath = join(directory, "rooms.sqlite");

    const firstProvider = createSqliteNodeRoomStorage({ databasePath });
    const firstRoom = await firstProvider.getStorage("main", "map-town");
    await firstRoom.put("state", { weather: "rain" });
    await firstRoom.put("tick", 42);

    const secondProvider = createSqliteNodeRoomStorage({ databasePath });
    const restoredRoom = await secondProvider.getStorage("main", "map-town");

    expect(await restoredRoom.get("state")).toEqual({ weather: "rain" });
    expect(await restoredRoom.list()).toEqual(new Map([
      ["state", { weather: "rain" }],
      ["tick", 42],
    ]));
    expect(await restoredRoom.delete("tick")).toBe(true);
    expect(await restoredRoom.get("tick")).toBeUndefined();
  });

  test("SQLite storage rejects a missing database source at runtime", () => {
    expect(() =>
      createSqliteNodeRoomStorage(
        // Exercise the runtime guard for untyped JavaScript consumers.
        {} as never,
      )
    ).toThrow("requires `database` or `databasePath`");
  });
});
