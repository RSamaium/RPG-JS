// @vitest-environment node
import { describe, expect, it } from "vitest";
import type { MapDefinition } from "../model/definition";
import { keyValueMapStore, type KeyValueStorage } from "./storage";

const definition = { version: 1, id: "m", size: [10, 10], elements: [], events: [] } as unknown as MapDefinition;

const memory = () => {
  const data = new Map<string, unknown>();
  const reads: string[] = [];
  const storage: KeyValueStorage = {
    get: (key) => (reads.push(key), data.get(key)),
    put: (key, value) => void data.set(key, value),
  };
  return { storage, reads };
};

describe("keyValueMapStore", () => {
  it("reads the log once, however many changes are appended", async () => {
    const { storage, reads } = memory();
    const store = keyValueMapStore(storage);
    await store.save("m", { definition, revision: 0 });
    for (let revision = 1; revision <= 5; revision += 1) await store.append!("m", { revision, patches: [] });
    expect(reads.filter((key) => key.endsWith(":log"))).toHaveLength(1);
    const loaded = await keyValueMapStore(storage).load("m");
    expect(loaded?.patches.map((entry) => entry.revision)).toEqual([1, 2, 3, 4, 5]);
  });

  it("drops what a snapshot covers", async () => {
    const { storage } = memory();
    const store = keyValueMapStore(storage);
    await store.save("m", { definition, revision: 0 });
    for (let revision = 1; revision <= 4; revision += 1) await store.append!("m", { revision, patches: [] });
    await store.save("m", { definition, revision: 3 });
    expect((await store.load("m"))?.patches.map((entry) => entry.revision)).toEqual([4]);
  });
});
