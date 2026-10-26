// @vitest-environment node
import { describe, expect, it } from "vitest";
import { PROTOCOL_LIMITS, parseClientMessage, parseServerMessage } from "./index";

const move = { type: "element.move", id: "t1", x: 1, y: 2 };

describe("parseClientMessage", () => {
  it("reads a sync, with or without the last revision known", () => {
    expect(parseClientMessage({ type: "sync" })).toEqual({ type: "sync" });
    expect(parseClientMessage({ type: "sync", since: 12 })).toEqual({ type: "sync", since: 12 });
    expect(parseClientMessage({ type: "sync", since: 0 })).toEqual({ type: "sync", since: 0 });
  });

  it("refuses a nonsense revision", () => {
    for (const since of [-1, 1.5, "3", NaN, null]) expect(parseClientMessage({ type: "sync", since }), String(since)).toBeUndefined();
  });

  it("reads an intent request with its id", () => {
    expect(parseClientMessage({ type: "intent", id: "r1", intents: [move] })).toEqual({ type: "intent", id: "r1", intents: [move] });
  });

  it("refuses an intent request that is not exactly that", () => {
    const bad = [
      { type: "intent", intents: [move] },
      { type: "intent", id: "", intents: [move] },
      { type: "intent", id: "x".repeat(PROTOCOL_LIMITS.maxIdLength + 1), intents: [move] },
      { type: "intent", id: "r1" },
      { type: "intent", id: "r1", intents: [] },
      { type: "intent", id: "r1", intents: "move" },
      { type: "intent", id: "r1", intents: [{ x: 1 }] },
      { type: "intent", id: "r1", intents: [3] },
      { type: "intent", id: "r1", intents: [{ ...move, f: () => 1 }] },
      { type: "intent", id: "r1", intents: Array.from({ length: PROTOCOL_LIMITS.maxIntents + 1 }, () => move) },
    ];
    for (const message of bad) expect(parseClientMessage(message), JSON.stringify(message)).toBeUndefined();
  });

  it("accepts as many intents as the limit allows", () => {
    const intents = Array.from({ length: PROTOCOL_LIMITS.maxIntents }, () => move);
    expect(parseClientMessage({ type: "intent", id: "r", intents })).toBeDefined();
  });

  it("reads a patches request, within limits", () => {
    const patch = { type: "element.remove", id: "t1" };
    expect(parseClientMessage({ type: "patches", id: "u1", patches: [patch] })).toEqual({ type: "patches", id: "u1", patches: [patch] });
    expect(parseClientMessage({ type: "patches", id: "u1", patches: [] })).toBeUndefined();
    expect(parseClientMessage({ type: "patches", id: "u1", patches: Array.from({ length: PROTOCOL_LIMITS.maxPatches + 1 }, () => patch) })).toBeUndefined();
  });

  it("refuses anything that is not a message, or that is of an unknown type", () => {
    for (const raw of [null, undefined, 3, "sync", [], { type: 3 }, {}, { type: "ping" }, { type: "toString" }]) {
      expect(parseClientMessage(raw), JSON.stringify(raw)).toBeUndefined();
    }
  });

  it("does not keep what it does not know", () => {
    expect(parseClientMessage({ type: "sync", since: 1, admin: true })).toEqual({ type: "sync", since: 1 });
    expect(parseClientMessage({ type: "intent", id: "r", intents: [move], force: true })).not.toHaveProperty("force");
  });
});

describe("parseServerMessage", () => {
  const definition = { version: 1, id: "m", size: [10, 10], elements: [], events: [] };

  it("reads a snapshot, a synced, a rejection and an effect", () => {
    expect(parseServerMessage({ type: "snapshot", revision: 4, definition })).toEqual({ type: "snapshot", revision: 4, definition });
    expect(parseServerMessage({ type: "synced", revision: 4 })).toEqual({ type: "synced", revision: 4 });
    expect(parseServerMessage({ type: "rejected", id: "r1", reason: "occupied", message: "Taken", patchIndex: 1 })).toEqual({
      type: "rejected",
      id: "r1",
      reason: "occupied",
      message: "Taken",
      patchIndex: 1,
    });
    expect(parseServerMessage({ type: "effect", target: "t1", name: "shake", params: { intensity: 4 } })).toEqual({
      type: "effect",
      target: "t1",
      name: "shake",
      params: { intensity: 4 },
    });
    expect(parseServerMessage({ type: "effect", target: { type: "event", id: "e" }, name: "blink" })).toMatchObject({ target: { type: "event", id: "e" } });
  });

  it("reads patches, with the request they answer and their author when there are some", () => {
    const patches = [{ type: "element.remove", id: "t1" }];
    expect(parseServerMessage({ type: "patches", revision: 3, patches })).toEqual({ type: "patches", revision: 3, patches });
    expect(parseServerMessage({ type: "patches", revision: 3, patches, requestId: "r1", author: "ann" })).toMatchObject({ requestId: "r1", author: "ann" });
  });

  it("refuses what is malformed, so a client never acts on garbage", () => {
    const bad = [
      { type: "snapshot", revision: -1, definition },
      { type: "snapshot", revision: 1 },
      { type: "snapshot", revision: 1, definition: "map" },
      { type: "patches", revision: 1 },
      { type: "patches", revision: 1.5, patches: [] },
      { type: "patches", revision: 1, patches: [3] },
      { type: "patches", revision: 1, patches: [], requestId: 3 },
      { type: "patches", revision: 1, patches: [], author: {} },
      { type: "rejected", id: "r" },
      { type: "synced" },
      { type: "effect", target: 3, name: "shake" },
      { type: "effect", target: { type: "terrain", id: "x" }, name: "shake" },
      { type: "effect", target: "t1" },
      { type: "effect", target: "t1", name: "shake", params: [] },
      { type: "nope" },
      null,
      "text",
    ];
    for (const message of bad) expect(parseServerMessage(message), JSON.stringify(message)).toBeUndefined();
  });
});
