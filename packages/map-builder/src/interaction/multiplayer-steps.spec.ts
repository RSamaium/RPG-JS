// @vitest-environment node
import { describe, expect, it } from "vitest";
import { createMapModel } from "../model/model";
import { defineCatalog } from "./catalog";
import type { InteractionController } from "./controller";
import { createPlacement } from "./placement";
import { ownerOnly, protectedZone, rateLimit } from "./steps";
import type { MapIntent } from "./intents";
import { harness, world } from "./__fixtures__";

interface Player {
  id: string;
  admin?: boolean;
}

const move = (id: string, x: number, y: number): MapIntent => ({ type: "element.move", id, x, y });
const remove = (id: string): MapIntent => ({ type: "element.remove", id });

/** The map with t1 owned by ann, t2 by bob and the house by nobody. */
function owned() {
  const model = createMapModel(world());
  model.apply({ type: "element.data", id: "t1", set: { owner: "ann" } });
  model.apply({ type: "element.data", id: "t2", set: { owner: "bob" } });
  const player: { current: Player | undefined } = { current: { id: "ann" } };
  const h = harness({ model, actor: () => player.current });
  return { ...h, player };
}

describe("ownerOnly", () => {
  const actor = (value: unknown) => (value as Player | undefined)?.id;

  it("lets the owner move and remove what is theirs", () => {
    const s = owned();
    s.controller.usePipeline("element.move", [ownerOnly({ actor })]);
    s.controller.usePipeline("element.remove", [ownerOnly({ actor })]);
    expect(s.controller.submit(move("t1", 10, 10)).ok).toBe(true);
    expect(s.controller.submit(remove("t1")).ok).toBe(true);
  });

  it("refuses what belongs to someone else, with a reason, and changes nothing", () => {
    const s = owned();
    s.controller.usePipeline("element.move", [ownerOnly({ actor })]);
    s.controller.usePipeline("element.remove", [ownerOnly({ actor })]);
    expect(s.controller.submit(move("t2", 10, 10))).toMatchObject({ ok: false, rejection: { code: "not-owner" } });
    expect(s.controller.submit(remove("t2"))).toMatchObject({ ok: false, rejection: { code: "not-owner" } });
    expect(s.model.getElement("t2")).toMatchObject({ x: 256, y: 160 });
  });

  it("leaves elements nobody owns free for all", () => {
    const s = owned();
    s.controller.usePipeline("element.move", [ownerOnly({ actor })]);
    expect(s.controller.submit(move("home", 10, 10)).ok).toBe(true);
  });

  it("refuses an unknown actor anything that is owned", () => {
    const s = owned();
    s.controller.usePipeline("element.move", [ownerOnly({ actor })]);
    s.player.current = undefined;
    expect(s.controller.submit(move("t1", 10, 10))).toMatchObject({ rejection: { code: "not-owner" } });
    expect(s.controller.submit(move("home", 10, 10)).ok).toBe(true);
  });

  it("lets some actors through, such as game masters", () => {
    const s = owned();
    s.controller.usePipeline("element.move", [ownerOnly({ actor, bypass: (who) => (who as Player).admin === true })]);
    s.player.current = { id: "zed", admin: true };
    expect(s.controller.submit(move("t1", 10, 10)).ok).toBe(true);
    s.player.current = { id: "zed" };
    expect(s.controller.submit(move("t2", 10, 10)).ok).toBe(false);
  });

  it("can find the owner somewhere else than data.owner", () => {
    const s = owned();
    s.controller.usePipeline("element.move", [ownerOnly({ actor, owner: (element) => (element.id === "home" ? "bob" : undefined) })]);
    expect(s.controller.submit(move("home", 10, 10))).toMatchObject({ rejection: { code: "not-owner" } });
    expect(s.controller.submit(move("t2", 10, 10)).ok).toBe(true); // data.owner is ignored now
  });

  it("is also checked by the preview, so a ghost or a drag can say it is refused", () => {
    const s = owned();
    s.controller.usePipeline("element.move", [ownerOnly({ actor })]);
    expect(s.controller.preview(move("t2", 10, 10) as never)).toMatchObject({ ok: false, reason: "not-owner" });
  });
});

describe("rateLimit", () => {
  const clock = (start = 0) => {
    const time = { now: start };
    return { time, now: () => time.now };
  };

  it("lets an actor do `max` things per window, then refuses with a reason", () => {
    const s = owned();
    const { time, now } = clock();
    s.controller.usePipeline("element.move", [rateLimit({ max: 2, windowMs: 1000, now })]);
    expect(s.controller.submit(move("home", 1, 1)).ok).toBe(true);
    expect(s.controller.submit(move("home", 2, 2)).ok).toBe(true);
    expect(s.controller.submit(move("home", 3, 3))).toMatchObject({ ok: false, rejection: { code: "rate-limit" } });
    expect(s.model.getElement("home")).toMatchObject({ x: 2 });
    void time;
  });

  it("lets the window slide: old actions stop counting", () => {
    const s = owned();
    const { time, now } = clock();
    s.controller.usePipeline("element.move", [rateLimit({ max: 2, windowMs: 1000, now })]);
    s.controller.submit(move("home", 1, 1)); // t = 0
    time.now = 600;
    s.controller.submit(move("home", 2, 2)); // t = 600
    time.now = 900;
    expect(s.controller.submit(move("home", 3, 3)).ok).toBe(false);
    time.now = 1001; // the first one is out of the window
    expect(s.controller.submit(move("home", 3, 3)).ok).toBe(true);
  });

  it("counts each actor on their own", () => {
    const s = owned();
    const { now } = clock();
    s.controller.usePipeline("element.move", [rateLimit({ max: 1, windowMs: 1000, now })]);
    s.player.current = { id: "ann" };
    expect(s.controller.submit(move("home", 1, 1)).ok).toBe(true);
    expect(s.controller.submit(move("home", 2, 2)).ok).toBe(false);
    s.player.current = { id: "bob" };
    expect(s.controller.submit(move("home", 3, 3)).ok).toBe(true);
  });

  it("can count per something else than the actor object, e.g. an id", () => {
    const s = owned();
    const { now } = clock();
    s.controller.usePipeline("element.move", [rateLimit({ max: 1, windowMs: 1000, now, key: (who) => (who as Player).id })]);
    s.player.current = { id: "ann" };
    s.controller.submit(move("home", 1, 1));
    s.player.current = { id: "ann" }; // another object, the same player
    expect(s.controller.submit(move("home", 2, 2)).ok).toBe(false);
  });

  it("counts actors that are plain values too", () => {
    const model = createMapModel(world());
    const h = harness({ model, actor: () => "ann" });
    h.controller.usePipeline("element.move", [rateLimit({ max: 1, windowMs: 1000, now: () => 0 })]);
    expect(h.controller.submit(move("home", 1, 1)).ok).toBe(true);
    expect(h.controller.submit(move("home", 2, 2)).ok).toBe(false);
  });

  it("does not count previews, which run on every pointer move", () => {
    const s = owned();
    const { now } = clock();
    s.controller.usePipeline("element.move", [rateLimit({ max: 2, windowMs: 1000, now })]);
    for (let i = 0; i < 50; i++) expect(s.controller.preview(move("home", i, i) as never).ok).toBe(true);
    expect(s.controller.submit(move("home", 1, 1)).ok).toBe(true);
    expect(s.controller.submit(move("home", 2, 2)).ok).toBe(true);
    expect(s.controller.submit(move("home", 3, 3)).ok).toBe(false);
  });

  it("limits any kind of intent when attached to several", () => {
    const s = owned();
    const { now } = clock();
    const limit = rateLimit<"element.move" | "element.remove">({ max: 1, windowMs: 1000, now });
    s.controller.usePipeline("element.move", [limit]);
    s.controller.usePipeline("element.remove", [limit]); // one shared budget
    expect(s.controller.submit(move("home", 1, 1)).ok).toBe(true);
    expect(s.controller.submit(remove("t1"))).toMatchObject({ rejection: { code: "rate-limit" } });
  });

  it("refuses nonsense limits", () => {
    expect(() => rateLimit({ max: 0, windowMs: 1000 })).toThrow(/max >= 1/);
    expect(() => rateLimit({ max: 1, windowMs: 0 })).toThrow(/windowMs > 0/);
  });
});

describe("protectedZone", () => {
  // t1 spans (128,96)-(192,192); t2 (256,160)-(320,256); the house (640,320)-(768,448)
  const square = { x: 100, y: 60, width: 120, height: 160 };
  const outside = { x: 900, y: 650, width: 50, height: 50 };

  it("forbids moving an element that stands in the zone", () => {
    const s = owned();
    s.controller.usePipeline("element.move", [protectedZone([square])]);
    expect(s.controller.submit(move("t1", 500, 500))).toMatchObject({ ok: false, rejection: { code: "protected-zone" } });
    expect(s.model.getElement("t1")).toMatchObject({ x: 128, y: 96 });
  });

  it("forbids moving an element into the zone", () => {
    const s = owned();
    s.controller.usePipeline("element.move", [protectedZone([square])]);
    expect(s.controller.submit(move("home", 120, 80))).toMatchObject({ rejection: { code: "protected-zone" } });
    expect(s.controller.submit(move("home", 800, 500)).ok).toBe(true);
  });

  it("forbids removing what stands in the zone", () => {
    const s = owned();
    s.controller.usePipeline("element.remove", [protectedZone([square])]);
    expect(s.controller.submit(remove("t1"))).toMatchObject({ rejection: { code: "protected-zone" } });
    expect(s.controller.submit(remove("home")).ok).toBe(true);
  });

  it("forbids placing in the zone, but not elsewhere", () => {
    const s = owned();
    const catalog = defineCatalog([{ id: "oak", sprite: "tree" }]);
    createPlacement(s.controller as unknown as InteractionController, { catalog, pipeline: [protectedZone([square])] });
    expect(s.controller.submit({ type: "element.place", catalogId: "oak", x: 110, y: 70 })).toMatchObject({ rejection: { code: "protected-zone" } });
    expect(s.controller.submit({ type: "element.place", catalogId: "oak", x: 400, y: 500 }).ok).toBe(true);
  });

  it("covers several zones, and a zone far away does not matter", () => {
    const s = owned();
    s.controller.usePipeline("element.move", [protectedZone([outside, { x: 600, y: 300, width: 200, height: 200 }])]);
    expect(s.controller.submit(move("t1", 500, 500)).ok).toBe(true);
    expect(s.controller.submit(move("t2", 650, 330))).toMatchObject({ rejection: { code: "protected-zone" } });
  });

  it("lets some actors in", () => {
    const s = owned();
    s.controller.usePipeline("element.move", [protectedZone([square], { except: (who) => (who as Player).admin === true })]);
    expect(s.controller.submit(move("t1", 500, 500)).ok).toBe(false);
    s.player.current = { id: "gm", admin: true };
    expect(s.controller.submit(move("t1", 500, 500)).ok).toBe(true);
  });
});
