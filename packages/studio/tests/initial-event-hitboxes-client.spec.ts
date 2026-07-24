import { describe, expect, test, vi } from "vitest";
import { bindInitialStudioEventHitboxes } from "../src/initial-event-hitboxes-client";

const createEvent = (hitbox = { w: 32, h: 32 }) => {
  let value = hitbox;
  return {
    hitbox: Object.assign(() => value, {
      set: vi.fn((next) => {
        value = next;
      }),
    }),
    setHitbox: vi.fn((width, height) => {
      value = { w: width, h: height };
    }),
  };
};

describe("Studio initial event hitbox hydration", () => {
  test("applies the API hitbox to events that still use the default client hitbox", () => {
    const event = createEvent();
    const scene = {
      data: () => ({
        events: [
          { eventId: "npc", hitbox: { width: 56, height: 50 } },
        ],
      }),
      events: () => ({ npc: event }),
    };

    bindInitialStudioEventHitboxes(scene);

    expect(event.setHitbox).toHaveBeenCalledWith(56, 50);
    expect(event.hitbox()).toEqual({ w: 56, h: 50 });
  });

  test("falls back to the last enabled trigger hitbox", () => {
    const event = createEvent();
    const scene = {
      data: () => ({
        events: [
          {
            eventId: "npc",
            triggers: [
              { enabled: true, hitbox: { width: 18, height: 26 } },
              { enabled: false, hitbox: { width: 90, height: 90 } },
              { enabled: true, hitbox: { width: 32, height: 48 } },
            ],
          },
        ],
      }),
      events: () => ({ npc: event }),
    };

    bindInitialStudioEventHitboxes(scene);

    expect(event.setHitbox).toHaveBeenCalledWith(32, 48);
    expect(event.hitbox()).toEqual({ w: 32, h: 48 });
  });

  test("hydrates repeated placements through their runtime ids", () => {
    const first = createEvent();
    const second = createEvent();
    const scene = {
      data: () => ({
        events: [
          {
            eventId: "monster",
            runtimeEventId: "monster",
            hitbox: { width: 56, height: 50 },
          },
          {
            eventId: "monster",
            runtimeEventId: "monster::2",
            hitbox: { width: 56, height: 50 },
          },
        ],
      }),
      events: () => ({
        monster: first,
        "monster::2": second,
      }),
    };

    bindInitialStudioEventHitboxes(scene);

    expect(first.setHitbox).toHaveBeenCalledWith(56, 50);
    expect(second.setHitbox).toHaveBeenCalledWith(56, 50);
  });

  test("does not overwrite a synchronized runtime hitbox", () => {
    const event = createEvent({ w: 18, h: 26 });
    const scene = {
      data: () => ({
        events: [
          { eventId: "npc", hitbox: { width: 56, height: 50 } },
        ],
      }),
      events: () => ({ npc: event }),
    };

    bindInitialStudioEventHitboxes(scene);

    expect(event.setHitbox).not.toHaveBeenCalled();
    expect(event.hitbox()).toEqual({ w: 18, h: 26 });
  });

  test("falls back to hitbox.set when setHitbox does not update the signal", () => {
    const event = createEvent();
    event.setHitbox = vi.fn();
    const scene = {
      data: () => ({
        data: {
          events: [
            { id: "npc", params: { hitbox: { w: 24, h: 40 } } },
          ],
        },
      }),
      events: () => ({ npc: event }),
    };

    bindInitialStudioEventHitboxes(scene);

    expect(event.setHitbox).toHaveBeenCalledWith(24, 40);
    expect(event.hitbox.set).toHaveBeenCalledWith({ w: 24, h: 40 });
    expect(event.hitbox()).toEqual({ w: 24, h: 40 });
  });

  test("applies the API hitbox when the synchronized event arrives after map loading", () => {
    const event = createEvent();
    let events: Record<string, any> = {};
    const subscribers = new Set<() => void>();
    const unsubscribe = vi.fn();
    const scene = {
      data: () => ({
        events: [
          { eventId: "npc", hitbox: { width: 56, height: 50 } },
        ],
      }),
      events: Object.assign(() => events, {
        observable: {
          subscribe: vi.fn((callback) => {
            subscribers.add(callback);
            return {
              unsubscribe: () => {
                unsubscribe();
                subscribers.delete(callback);
              },
            };
          }),
        },
      }),
    };

    bindInitialStudioEventHitboxes(scene);

    expect(event.setHitbox).not.toHaveBeenCalled();

    events = { npc: event };
    subscribers.forEach((callback) => callback());

    expect(event.setHitbox).toHaveBeenCalledWith(56, 50);
    expect(event.hitbox()).toEqual({ w: 56, h: 50 });
    expect(unsubscribe).toHaveBeenCalled();
  });

  test("does not reapply the static API hitbox after the initial hydration", () => {
    const event = createEvent();
    let events: Record<string, any> = { npc: event };
    const subscribers = new Set<() => void>();
    const scene = {
      data: () => ({
        events: [
          { eventId: "npc", hitbox: { width: 56, height: 50 } },
        ],
      }),
      events: Object.assign(() => events, {
        observable: {
          subscribe: vi.fn((callback) => {
            subscribers.add(callback);
            return {
              unsubscribe: () => subscribers.delete(callback),
            };
          }),
        },
      }),
    };

    bindInitialStudioEventHitboxes(scene);
    event.hitbox.set({ w: 32, h: 32 });
    events = { npc: event };
    subscribers.forEach((callback) => callback());

    expect(event.setHitbox).toHaveBeenCalledTimes(1);
    expect(event.hitbox()).toEqual({ w: 32, h: 32 });
  });
});
