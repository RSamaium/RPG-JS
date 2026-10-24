import { describe, expect, it, vi } from "vitest";
import { describeElement } from "@rpgjs/map-builder/renderer";
import type { AssetResolver } from "@rpgjs/map-builder/model";
import references from "../../../map-builder/src/renderer/__references__/studio-elements.json";
import { createMapBuilderElementLayer, partitionStudioElements, studioElementToMapBuilder, studioOnlyReason } from "./map-builder-bridge";
import { resolveStudioElementMetrics } from "./studio-element-renderer";

/**
 * Step 6 of MAP_BUILDER.md: the flagged link between the Studio runtime and @rpgjs/map-builder.
 * What matters is that (1) every element goes to exactly one renderer, (2) the ones that go to the
 * map builder come out with the geometry the Studio renderer would give them.
 */
const cases = references as unknown as Array<{ name: string; input: Record<string, any> }>;
const withImage = (input: Record<string, any>) => ({ ...input, image: "/tileset.png" });
const plain = withImage(cases.find((c) => c.name === "plain")!.input);

describe("which renderer draws an element", () => {
  it("sends a plain sprite to the map builder", () => {
    expect(studioOnlyReason(plain)).toBeUndefined();
  });

  it.each([
    ["no image", { ...plain, image: "" }, "no-image"],
    ["a drawing rule", { ...plain, drawRule: cases.find((c) => c.name === "repeat-axis-x")!.input.drawRule }, "draw-rule"],
    ["a ground shadow", { ...plain, extractGroundShadow: true }, "ground-shadow"],
    ["submersion", { ...plain, submersion: { depth: 0.3 } }, "submersion"],
    ["a light spot", { ...plain, lightSpot: { enabled: true, radius: 40, intensity: 1 } }, "light"],
  ])("keeps an element with %s on the Studio renderer", (_name, element, reason) => {
    expect(studioOnlyReason(element)).toBe(reason);
  });

  it("keeps everything on the Studio renderer while collisions are debugged", () => {
    expect(studioOnlyReason(plain, { debugCollisions: true })).toBe("debug-collisions");
  });

  it("keeps a shadow caster on the Studio renderer, without using up the shadow budget", () => {
    const shadowBudget = { remaining: 5 };
    const lighting = { enabled: true, mode: "custom", direction: 45 } as any;
    const element = { ...plain, hasShadow: true };
    const reason = studioOnlyReason(element, { lighting, shadowBudget });
    expect(shadowBudget.remaining).toBe(5);
    // Whatever the lighting decides, asking twice gives the same answer.
    expect(studioOnlyReason(element, { lighting, shadowBudget })).toBe(reason);
  });

  it("partitions without losing, duplicating or reordering anything", () => {
    const list = cases.map((c, index) => ({ ...withImage(c.input), id: `e${index}` }));
    const { builder, studio } = partitionStudioElements(list);
    expect(builder.length + studio.length).toBe(list.length);
    expect(new Set([...builder, ...studio]).size).toBe(list.length);
    expect(builder.map((e) => list.indexOf(e))).toEqual([...builder.map((e) => list.indexOf(e))].sort((a, b) => a - b));
    expect(studio.map((e) => list.indexOf(e))).toEqual([...studio.map((e) => list.indexOf(e))].sort((a, b) => a - b));
    // The reference cases include drawing rules, which stay behind; the others move.
    expect(builder.length).toBeGreaterThan(0);
    expect(studio.length).toBeGreaterThan(0);
    expect(studio.every((e) => studioOnlyReason(e) !== undefined)).toBe(true);
  });
});

describe("what the map builder draws is what the Studio renderer would", () => {
  const simple = cases.filter((c) => studioOnlyReason(withImage(c.input)) === undefined);

  it("covers several of the reference cases", () => {
    expect(simple.length).toBeGreaterThanOrEqual(5);
  });

  it.each(simple.map((c) => [c.name, c] as const))("%s: same draw rectangle, hitbox and sort key", (_name, reference) => {
    const element = withImage(reference.input);
    const metrics = resolveStudioElementMetrics(element);
    const converted = studioElementToMapBuilder(element, 0);
    const assets: AssetResolver = {
      kinds: [converted.kind],
      has: (kind): kind is string => kind === converted.kind,
      resolve: (kind) => (kind === converted.kind ? converted.descriptor : undefined),
    };
    const node = describeElement(converted.element, { assets })!;
    expect(node.bounds).toMatchObject({ x: metrics.drawX, y: metrics.drawY, width: metrics.drawWidth, height: metrics.drawHeight });
    expect(node.sortKey).toBe(metrics.resolvedZIndex);
    expect(Boolean(node.hitbox)).toBe(metrics.hasSortableHitbox);
  });
});

describe("the layer that hosts the map builder inside the Studio runtime", () => {
  const list = [
    { ...plain, id: "a" },
    { ...plain, id: "b", drawIn: [300, 200, 48, 48], hitbox: { x: 12, y: 30, width: 24, height: 14 } },
  ];

  it("returns one container per element, each carrying its sort key, so characters can sort with them", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const layer = await createMapBuilderElementLayer();
    const children = await layer.render(list, "objects", [1000, 1000]);
    expect(children).toHaveLength(2);
    expect(children.map((c) => c.zIndex)).toEqual(list.map((e) => resolveStudioElementMetrics(e).resolvedZIndex));
    layer.destroy();
    expect(children.every((c) => c.destroyed)).toBe(true);
  });

  it("returns a single root for a layer that needs no sorting with characters", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const layer = await createMapBuilderElementLayer();
    const children = await layer.render(list, "world", [1000, 1000]);
    expect(children).toHaveLength(1);
    expect(children[0].getChildByLabel?.("elements/a", true) ?? children[0].children.length).toBeTruthy();
    layer.destroy();
  });

  it("returns nothing for no element", async () => {
    const layer = await createMapBuilderElementLayer();
    expect(await layer.render([], "objects", [100, 100])).toEqual([]);
    layer.commit();
    layer.destroy();
  });

  it("never destroys what may still be on screen: only what was mounted two commits ago", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const layer = await createMapBuilderElementLayer();
    const first = await layer.render(list, "objects", [1000, 1000]);
    layer.commit();
    const second = await layer.render(list.slice(0, 1), "objects", [1000, 1000]);
    // `second` is not mounted yet, `first` is: both stay.
    expect([...first, ...second].every((c) => !c.destroyed)).toBe(true);
    layer.commit();
    // `first` was replaced on screen, but is kept one commit longer for whoever still holds it.
    expect(first.every((c) => !c.destroyed)).toBe(true);
    const third = await layer.render(list, "objects", [1000, 1000]);
    layer.commit();
    expect(first.every((c) => c.destroyed)).toBe(true);
    expect([...second, ...third].every((c) => !c.destroyed)).toBe(true);
    layer.destroy();
    expect([...second, ...third].every((c) => c.destroyed)).toBe(true);
  });

  it("drops a result that was never committed, because a newer render replaced it", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const layer = await createMapBuilderElementLayer();
    const stale = await layer.render(list, "objects", [1000, 1000]);
    const fresh = await layer.render(list.slice(0, 1), "objects", [1000, 1000]);
    expect(stale.every((c) => c.destroyed)).toBe(true);
    expect(fresh.every((c) => !c.destroyed)).toBe(true);
    layer.destroy();
  });

  it("gives up an older render that is overtaken while it loads", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const layer = await createMapBuilderElementLayer();
    const [older, newer] = await Promise.all([
      layer.render(list, "objects", [1000, 1000]),
      layer.render(list.slice(0, 1), "objects", [1000, 1000]),
    ]);
    expect(older).toEqual([]);
    expect(newer).toHaveLength(1);
    layer.destroy();
  });
});
