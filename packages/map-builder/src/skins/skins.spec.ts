// @vitest-environment node
import { Container, Graphics, Sprite, Texture, TextureSource } from "pixi.js";
import { describe, expect, it, vi } from "vitest";
import type { InteractionSnapshot } from "../interaction/controller";
import { assets, sceneOf, world } from "../interaction/__fixtures__";
import { createMapModel } from "../model/model";
import { createTextureStore } from "../renderer/textures";
import { shapesOf } from "../features/__fixtures__";
import { defaultSkin, defineSkin, drawFrames, gameSkin, mergeSkin, SKIN_COLORS, type SkinContext, type SkinLayerFactory } from "./index";

const t1 = { type: "element", id: "t1" } as const;

const snapshot = (overrides: Partial<InteractionSnapshot> = {}): InteractionSnapshot => ({
  modes: ["edit"],
  hovered: null,
  selection: [],
  drag: null,
  marquee: null,
  placing: null,
  ghost: null,
  lastRejection: null,
  ...overrides,
});

function context(options: { delayed?: boolean } = {}) {
  const model = createMapModel(world());
  const layer = new Container();
  const waiting: Array<() => void> = [];
  const textures = createTextureStore({
    load: () => {
      const texture = new Texture({ source: new TextureSource({ width: 64, height: 64 }) });
      return options.delayed ? new Promise<Texture>((resolve) => waiting.push(() => resolve(texture))) : texture;
    },
  });
  const requestUpdate = vi.fn();
  const ctx: SkinContext = { layer, textures, assets, nodes: () => sceneOf(model), requestUpdate };
  return { ctx, layer, model, requestUpdate, release: () => waiting.splice(0).forEach((resolve) => resolve()) };
}

const draw = (factory: SkinLayerFactory | undefined, state: InteractionSnapshot, ctx = context()) => {
  const skinLayer = factory!(ctx.ctx);
  skinLayer.update(state);
  return { ...ctx, skinLayer };
};

describe("skin parts", () => {
  it("mergeSkin replaces the parts that are given and keeps the others", () => {
    const a: SkinLayerFactory = () => ({ update: () => undefined, destroy: () => undefined });
    const b: SkinLayerFactory = () => ({ update: () => undefined, destroy: () => undefined });
    const merged = mergeSkin({ selection: a, hover: a }, { selection: b });
    expect(merged.selection).toBe(b);
    expect(merged.hover).toBe(a);
    expect(mergeSkin({ selection: a }, undefined)).toEqual({ selection: a });
  });

  it("defineSkin returns what it is given", () => {
    const skin = { ghost: () => ({ update: () => undefined, destroy: () => undefined }) };
    expect(defineSkin(skin)).toBe(skin);
  });

  it("the default skin has every part, and so has the game skin", () => {
    for (const skin of [defaultSkin(), gameSkin()]) {
      expect(Object.keys(skin).sort()).toEqual(["drag", "ghost", "hover", "marquee", "selection"]);
    }
  });

  it("drawFrames clears what was drawn before", () => {
    const g = new Graphics();
    drawFrames(g, [{ rect: { x: 0, y: 0, width: 5, height: 5 }, color: 1, width: 1 }]);
    drawFrames(g, []);
    expect(g.context.instructions).toHaveLength(0);
  });

  it("drawFrames can fill, stroke or both", () => {
    const g = new Graphics();
    drawFrames(g, [{ rect: { x: 1, y: 2, width: 3, height: 4 }, color: 0xff0000, width: 2, alpha: 0.5, fill: 0.2 }]);
    expect(shapesOf({ children: [g] } as unknown as Container).map((s) => s.action)).toEqual(["fill", "stroke"]);
  });
});

describe("default skin", () => {
  it("frames the selection with the bounds of each selected element", () => {
    const { layer } = draw(defaultSkin().selection, snapshot({ selection: [t1, { type: "event", id: "chest-1" }] }));
    expect(shapesOf(layer).map((s) => s.rect)).toEqual([
      { x: 128, y: 96, width: 64, height: 96 },
      { x: 700, y: 600, width: 16, height: 16 },
    ]);
    expect(shapesOf(layer).every((s) => s.color === SKIN_COLORS.accent)).toBe(true);
  });

  it("ignores a selected thing that is not on the map any more", () => {
    const { layer } = draw(defaultSkin().selection, snapshot({ selection: [{ type: "element", id: "gone" }] }));
    expect(shapesOf(layer)).toEqual([]);
  });

  it("draws a lighter frame for what is hovered, and none for what is selected", () => {
    const hover = draw(defaultSkin().hover, snapshot({ hovered: t1 }));
    expect(shapesOf(hover.layer)).toHaveLength(1);
    expect(shapesOf(hover.layer)[0]!.alpha).toBeLessThan(1);
    const both = draw(defaultSkin().hover, snapshot({ hovered: t1, selection: [t1] }));
    expect(shapesOf(both.layer)).toEqual([]);
  });

  it("draws the drag where the things would land, or where they are when live", () => {
    const state = (live: boolean) =>
      snapshot({ drag: { targets: [t1], origin: { x: 0, y: 0 }, delta: { x: 10, y: 20 }, valid: true, live } });
    expect(shapesOf(draw(defaultSkin().drag, state(false)).layer)[0]!.rect).toEqual({ x: 138, y: 116, width: 64, height: 96 });
    expect(shapesOf(draw(defaultSkin().drag, state(true)).layer)[0]!.rect).toEqual({ x: 128, y: 96, width: 64, height: 96 });
  });

  it("draws the drag red when it is refused", () => {
    const { layer } = draw(defaultSkin().drag, snapshot({ drag: { targets: [t1], origin: { x: 0, y: 0 }, delta: { x: 1, y: 1 }, valid: false, reason: "occupied", live: false } }));
    expect(shapesOf(layer).every((s) => s.color === SKIN_COLORS.invalid)).toBe(true);
  });

  it("draws the rubber band", () => {
    const { layer } = draw(defaultSkin().marquee, snapshot({ marquee: { x: 5, y: 6, width: 70, height: 80 } }));
    expect(shapesOf(layer).map((s) => s.rect)).toEqual([{ x: 5, y: 6, width: 70, height: 80 }, { x: 5, y: 6, width: 70, height: 80 }]);
    expect(shapesOf(draw(defaultSkin().marquee, snapshot()).layer)).toEqual([]);
  });

  it("redraws when asked to, instead of stacking drawings", () => {
    const { skinLayer, layer } = draw(defaultSkin().selection, snapshot({ selection: [t1] }));
    skinLayer.update(snapshot({ selection: [t1] }));
    skinLayer.update(snapshot({ selection: [t1] }));
    expect(shapesOf(layer)).toHaveLength(1);
  });

  it("removes what it drew when destroyed", () => {
    const { skinLayer, layer } = draw(defaultSkin().selection, snapshot({ selection: [t1] }));
    skinLayer.destroy();
    expect(layer.children.every((child) => child.destroyed)).toBe(true);
  });
});

describe("ghost layer", () => {
  const ghost = (overrides = {}) => ({
    catalogId: "oak",
    kind: "tree",
    x: 100,
    y: 200,
    valid: true,
    bounds: { x: 100, y: 200, width: 64, height: 96 },
    hitbox: { x: 116, y: 270, width: 32, height: 20 },
    ...overrides,
  });

  it("is hidden when there is no ghost, or no place to draw it", () => {
    const { layer } = draw(defaultSkin().ghost, snapshot());
    expect((layer.children[0] as Container).visible).toBe(false);
    const noBounds = draw(defaultSkin().ghost, snapshot({ ghost: ghost({ bounds: undefined }) }));
    expect((noBounds.layer.children[0] as Container).visible).toBe(false);
  });

  it("draws the image of the item where it would stand, translucent, with the outline of the hitbox", async () => {
    const ctx = context();
    await ctx.ctx.textures.ready("/tree.png");
    const { layer } = draw(defaultSkin().ghost, snapshot({ ghost: ghost() }), ctx);
    const holder = layer.children[0] as Container;
    const sprite = holder.children[0] as Sprite;
    expect(holder.visible).toBe(true);
    expect(sprite.alpha).toBeLessThan(1);
    expect([sprite.x, sprite.y, sprite.width, sprite.height]).toEqual([100, 200, 64, 96]);
    const shapes = shapesOf({ children: [holder.children[1]] } as unknown as Container);
    expect(shapes.map((s) => s.rect)).toContainEqual({ x: 116, y: 270, width: 32, height: 20 });
  });

  it("waits for the image, and asks to be drawn again once it has loaded", async () => {
    const ctx = context({ delayed: true });
    const { layer } = draw(defaultSkin().ghost, snapshot({ ghost: ghost() }), ctx);
    const sprite = (layer.children[0] as Container).children[0] as Sprite;
    expect(sprite.visible).toBe(false);
    ctx.release();
    await vi.waitFor(() => expect(ctx.requestUpdate).toHaveBeenCalled());
  });

  it("tints the item red when it cannot be placed", () => {
    const { layer } = draw(defaultSkin().ghost, snapshot({ ghost: ghost({ valid: false, reason: "occupied" }) }));
    expect(((layer.children[0] as Container).children[0] as Sprite).tint).toBe(SKIN_COLORS.invalid);
  });

  it("draws nothing for an asset nobody knows", () => {
    const { layer } = draw(defaultSkin().ghost, snapshot({ ghost: ghost({ kind: "dragon" }) }));
    expect((((layer.children[0] as Container).children[0]) as Sprite).visible).toBe(false);
  });
});

describe("game skin", () => {
  it("surrounds a selection with a soft halo by default, and a plain line on request", () => {
    const state = snapshot({ selection: [t1] });
    const glow = shapesOf(draw(gameSkin().selection, state).layer);
    const line = shapesOf(draw(gameSkin({ outline: "line" }).selection, state).layer);
    expect(glow).toHaveLength(2);
    expect(glow[0]!.width).toBeGreaterThan(glow[1]!.width!);
    expect(glow[0]!.alpha).toBeLessThan(glow[1]!.alpha!);
    expect(line).toHaveLength(1);
  });

  it("takes the colour of the game", () => {
    const state = snapshot({ selection: [t1] });
    expect(shapesOf(draw(gameSkin({ color: 0x123456 }).selection, state).layer).every((s) => s.color === 0x123456)).toBe(true);
    expect(shapesOf(draw(gameSkin().selection, state).layer)[0]!.color).toBe(0xfacc15);
  });

  it("gives the ghost the colours it is given", () => {
    const ghost = (valid: boolean) =>
      snapshot({ ghost: { catalogId: "oak", kind: "tree", x: 0, y: 0, valid, bounds: { x: 0, y: 0, width: 64, height: 96 } } });
    const skin = gameSkin({ ghost: { valid: 0x66ff66, invalid: 0xff5555, alpha: 0.4 } });
    const ok = draw(skin.ghost, ghost(true));
    expect(shapesOf({ children: [(ok.layer.children[0] as Container).children[1]] } as unknown as Container).every((s) => s.color === 0x66ff66)).toBe(true);
    expect(((ok.layer.children[0] as Container).children[0] as Sprite).alpha).toBe(0.4);
    const bad = draw(skin.ghost, ghost(false));
    expect(shapesOf({ children: [(bad.layer.children[0] as Container).children[1]] } as unknown as Container).every((s) => s.color === 0xff5555)).toBe(true);
  });

  it("makes the ghost pulse with time, and only when asked to", () => {
    const state = snapshot({ ghost: { catalogId: "oak", kind: "tree", x: 0, y: 0, valid: true, bounds: { x: 0, y: 0, width: 64, height: 96 } } });
    const alphaAfter = (pulse: boolean, ms: number) => {
      const { skinLayer, layer } = draw(gameSkin({ pulse }).ghost, state);
      skinLayer.tick?.(ms);
      return ((layer.children[0] as Container).children[0] as Sprite).alpha;
    };
    expect(alphaAfter(false, 0)).toBe(alphaAfter(false, 500));
    expect(alphaAfter(true, 0)).not.toBe(alphaAfter(true, 280));
    expect(alphaAfter(true, 280)).toBeGreaterThanOrEqual(0.15);
  });
});
