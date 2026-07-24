import { describe, expect, test } from "vitest";
import { assignStudioEventPlacementIds } from "../src/event-placement";

describe("Studio event placement ids", () => {
  test("keeps the first definition id and suffixes repeated placements", () => {
    const events = assignStudioEventPlacementIds([
      { eventId: "monster", x: 588, y: 556 },
      { eventId: "monster", x: 737, y: 507 },
    ]);

    expect(events).toEqual([
      expect.objectContaining({
        sourceEventId: "monster",
        runtimeEventId: "monster",
        x: 588,
        y: 556,
      }),
      expect.objectContaining({
        sourceEventId: "monster",
        runtimeEventId: "monster::2",
        x: 737,
        y: 507,
      }),
    ]);
  });

  test("avoids collisions with an existing suffixed definition id", () => {
    const events = assignStudioEventPlacementIds([
      { eventId: "monster" },
      { eventId: "monster" },
      { eventId: "monster::2" },
    ]);

    expect(events.map((event) => event.runtimeEventId)).toEqual([
      "monster",
      "monster::3",
      "monster::2",
    ]);
  });

  test("reads ids from hydrated Studio event definitions", () => {
    const events = assignStudioEventPlacementIds([
      { eventId: { _id: "monster" }, x: 10, y: 20 },
      { eventId: { _id: "monster" }, x: 30, y: 40 },
    ]);

    expect(events.map((event) => event.sourceEventId)).toEqual([
      "monster",
      "monster",
    ]);
    expect(events.map((event) => event.runtimeEventId)).toEqual([
      "monster",
      "monster::2",
    ]);
  });
});
