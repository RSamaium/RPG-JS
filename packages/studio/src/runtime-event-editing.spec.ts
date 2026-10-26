import { describe, expect, it, vi } from "vitest";
import { createStudioRuntimeEventEditing, type StudioRuntimeEventMap } from "./runtime-event-editing";

const setup = (scale = 2) => {
  const teleport = vi.fn(async () => undefined);
  const events: Record<string, any> = { guard: { sourceEventId: "guard", teleport }, "guard::2": { sourceEventId: "guard", teleport }, tree: {} };
  const created: any[] = [];
  const map: StudioRuntimeEventMap = {
    scale,
    events: () => events,
    getEvent: (id) => events[id],
    createDynamicEvent: async (placement) => (created.push(placement), placement.id),
    removeEvent: vi.fn((id: string) => void delete events[id]),
  };
  const hydrate = vi.fn(async (list: any[]) => list.map((event) => ({ ...event, hydrated: true })));
  return { editing: createStudioRuntimeEventEditing(map, hydrate), map, created, hydrate, teleport, events };
};

describe("changing the events the game runs without loading it again", () => {
  it("puts an event of the project on the map, as the load does: its media resolved, under an id of its own", async () => {
    const { editing, created, hydrate } = setup();
    const id = await editing.placeStudioEvent({ _id: "e1", name: "Guard", params: { graphic: "media-1" } }, { x: 100, y: 200, runtimeId: "e1::m1" });

    expect(id).toBe("e1::m1");
    expect(hydrate).toHaveBeenCalledWith([expect.objectContaining({ _id: "e1", eventId: "e1", sourceEventId: "e1", runtimeEventId: "e1::m1", x: 100, y: 200 })]);
    expect(created[0]).toMatchObject({ id: "e1::m1", x: 100, y: 200, event: { hydrated: true, name: "Guard" } });
  });

  it("moves an event, in the pixels the game runs in (the map scale times the position the map stores)", async () => {
    const { editing, teleport } = setup(2);
    await expect(editing.moveStudioEvent("guard", 10, 20)).resolves.toBe(true);
    expect(teleport).toHaveBeenCalledWith({ x: 20, y: 40 });
    await expect(editing.moveStudioEvent("nobody", 1, 1)).resolves.toBe(false);
    await expect(editing.moveStudioEvent("tree", 1, 1)).resolves.toBe(false); // nothing that can move
  });

  it("takes an event off the map, and says whether there was one", () => {
    const { editing, map } = setup();
    expect(editing.removeStudioEvent("guard")).toBe(true);
    expect(map.removeEvent).toHaveBeenCalledWith("guard");
    expect(editing.removeStudioEvent("guard")).toBe(false);
  });

  it("lists the events it runs with the event of the project each one is", () => {
    const { editing } = setup();
    expect(editing.listStudioEvents()).toEqual([
      { runtimeId: "guard", sourceEventId: "guard" },
      { runtimeId: "guard::2", sourceEventId: "guard" },
      { runtimeId: "tree", sourceEventId: "" },
    ]);
  });
});
