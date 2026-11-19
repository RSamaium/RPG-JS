import { describe, expect, it } from "vitest";
import { computed } from "canvasengine";
import { MapObjectVisibility } from "./mapObjectVisibility";

const event = {} as any;
const player = {} as any;

describe("map object visibility", () => {
  it("hides nothing without a filter", () => {
    const visibility = new MapObjectVisibility();
    expect(visibility.isHidden("events", "merchant", event, "me")).toBe(false);
    expect(visibility.isHidden("players", "other", player, "me")).toBe(false);
  });

  it("hides every event, or the events of a list", () => {
    const visibility = new MapObjectVisibility();
    const restoreAll = visibility.hide({ events: true });
    expect(visibility.isHidden("events", "merchant", event, "me")).toBe(true);
    expect(visibility.isHidden("players", "other", player, "me")).toBe(false);
    restoreAll();

    visibility.hide({ events: ["guard"] });
    expect(visibility.isHidden("events", "guard", event, "me")).toBe(true);
    expect(visibility.isHidden("events", "merchant", event, "me")).toBe(false);
  });

  it("hides every player but the local one with 'others'", () => {
    const visibility = new MapObjectVisibility();
    visibility.hide({ players: "others" });
    expect(visibility.isHidden("players", "other", player, "me")).toBe(true);
    expect(visibility.isHidden("players", "me", player, "me")).toBe(false);
    // The events are not concerned
    expect(visibility.isHidden("events", "other", event, "me")).toBe(false);
  });

  it("hides the local player too with true", () => {
    const visibility = new MapObjectVisibility();
    visibility.hide({ players: true });
    expect(visibility.isHidden("players", "me", player, "me")).toBe(true);
  });

  it("asks a selector function with the object and its id", () => {
    const visibility = new MapObjectVisibility();
    const skeleton = { kind: "monster" } as any;
    visibility.hide({ events: (object: any, id) => object.kind === "monster" && id.startsWith("skeleton") });
    expect(visibility.isHidden("events", "skeleton-1", skeleton, "me")).toBe(true);
    expect(visibility.isHidden("events", "merchant", event, "me")).toBe(false);
  });

  it("composes calls: an object shows again once no call hides it", () => {
    const visibility = new MapObjectVisibility();
    const battle = visibility.hide({ events: true });
    const cutscene = visibility.hide({ events: ["merchant"] });
    battle();
    expect(visibility.isHidden("events", "merchant", event, "me")).toBe(true);
    expect(visibility.isHidden("events", "guard", event, "me")).toBe(false);
    cutscene();
    expect(visibility.isHidden("events", "merchant", event, "me")).toBe(false);
  });

  it("ignores a restore function called twice", () => {
    const visibility = new MapObjectVisibility();
    const first = visibility.hide({ events: true });
    first();
    visibility.hide({ events: true });
    first();
    expect(visibility.isHidden("events", "merchant", event, "me")).toBe(true);
  });

  it("drops every filter on clear, and the old restore functions do nothing", () => {
    const visibility = new MapObjectVisibility();
    const restore = visibility.hide({ events: true });
    visibility.clear();
    expect(visibility.isHidden("events", "merchant", event, "me")).toBe(false);
    restore();
    const next = visibility.hide({ players: "others" });
    restore();
    expect(visibility.isHidden("players", "other", player, "me")).toBe(true);
    next();
  });

  it("is reactive: a computed visibility follows hide and restore", () => {
    const visibility = new MapObjectVisibility();
    const visible = computed(() => !visibility.isHidden("events", "merchant", event, "me"));
    expect(visible()).toBe(true);
    const restore = visibility.hide({ events: true });
    expect(visible()).toBe(false);
    restore();
    expect(visible()).toBe(true);
  });

  it("does not keep a reference to the options object it was given", () => {
    const visibility = new MapObjectVisibility();
    const options: { events: boolean } = { events: true };
    visibility.hide(options);
    options.events = false;
    expect(visibility.isHidden("events", "merchant", event, "me")).toBe(true);
  });
});
