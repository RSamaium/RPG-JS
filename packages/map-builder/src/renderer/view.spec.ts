// @vitest-environment node
import { Container, Sprite, Texture, TextureSource } from "pixi.js";
import { describe, expect, it, vi } from "vitest";
import { defineAssets } from "../model/assets";
import type { MapElement } from "../model/definition";
import { defineMap, el, event } from "../model/define-map";
import { createMapModel } from "../model/model";
import type { MapPatch } from "../model/patches";
import { MapFeatureError, defineMapFeature } from "./feature";
import { elements, events } from "../features";
import { attachMapView, createMapView, type MapViewOptions, type PixiApplicationLike } from "./view";
import type { TextureProvider } from "./textures";

const assets = defineAssets({
  tree: { src: "/tree.png", size: [64, 96], hitbox: [16, 70, 32, 20] },
  house: { src: "/house.png", size: [128, 128] },
  chest: { src: "/chest.png", size: [16, 16] },
  wood: { src: "/wood.png", size: [16, 16] },
  unsized: { src: "/unsized.png" },
});

const forest = () =>
  defineMap(assets, {
    id: "forest",
    size: [2560, 1920],
    elements: [
      el("house", { id: "home", x: 640, y: 320 }),
      el("tree", { id: "t1", x: 128, y: 96 }),
      el("tree", { id: "t2", x: 256, y: 160 }),
    ],
    events: [event("chest", { id: "chest-1", x: 700, y: 400, graphic: "chest" })],
  });

/** Textures of known sizes, loaded instantly or when `release()` is called. */
function fakeTextures(options: { delayed?: boolean; fail?: string[]; sizes?: Record<string, [number, number]> } = {}) {
  const loads: string[] = [];
  const waiting: Array<() => void> = [];
  const sizes = options.sizes ?? {};
  const provider: TextureProvider = {
    load(src) {
      loads.push(src);
      if (options.fail?.includes(src)) return Promise.reject(new Error(`cannot load ${src}`));
      const [width, height] = sizes[src] ?? [64, 64];
      const texture = new Texture({ source: new TextureSource({ width, height }) });
      if (!options.delayed) return texture;
      return new Promise<Texture>((resolve) => waiting.push(() => resolve(texture)));
    },
  };
  return { provider, loads, release: () => waiting.splice(0).forEach((resolve) => resolve()) };
}

function setup(overrides: Partial<MapViewOptions> = {}, textures = fakeTextures()) {
  const model = createMapModel(forest());
  const view = createMapView({
    model,
    assets,
    features: [elements(), events()],
    textures: textures.provider,
    onError: vi.fn(),
    ...overrides,
  });
  return { model, view, textures };
}

const container = (view: ReturnType<typeof createMapView>, key: string) =>
  view.stages.objects.children.find((child) => child.label === key) as Container | undefined;

describe("createMapView", () => {
  describe("scene", () => {
    it("draws every element and every event with a graphic", async () => {
      const { view } = setup();
      await view.whenIdle();
      expect(view.describe().map((node) => node.key).sort()).toEqual(["elements/home", "elements/t1", "elements/t2", "events/chest-1"]);
      expect(view.stages.objects.children).toHaveLength(4);
    });

    it("exposes one container per stage, back to front, and a single root to mount anywhere", () => {
      const { view } = setup();
      expect(view.root.children.map((child) => child.label)).toEqual(["ground", "objects", "overlay", "lighting", "post"]);
      expect(view.stages.ground.children).toHaveLength(0);
    });

    it("places each part where the scene says, at the size the scene says", async () => {
      const { view } = setup();
      await view.whenIdle();
      const sprite = container(view, "elements/t1")!.children[0] as Sprite;
      expect([sprite.x, sprite.y, sprite.width, sprite.height]).toEqual([128, 96, 64, 96]);
    });

    it("draws in depth order: the lower the sort key, the further back", async () => {
      const { view } = setup();
      const keyOf = (key: string) => container(view, key)!.zIndex;
      expect(view.stages.objects.sortableChildren).toBe(true);
      expect(keyOf("elements/t1")).toBe(96 + 90);
      expect(keyOf("elements/t2")).toBe(160 + 90);
      expect(keyOf("elements/home")).toBe(320 + 128);
      expect(keyOf("elements/t1")).toBeLessThan(keyOf("elements/t2"));
    });

    it("draws nothing without features", () => {
      const { view } = setup({ features: [] });
      expect(view.describe()).toEqual([]);
    });
  });

  describe("incremental updates", () => {
    it("moves an element and re-sorts it, leaving every other container untouched", async () => {
      const { model, view } = setup();
      const home = container(view, "elements/home");
      const t2 = container(view, "elements/t2");
      model.apply({ type: "element.move", id: "t1", x: 500, y: 700 });

      const t1 = container(view, "elements/t1")!;
      expect((t1.children[0] as Sprite).x).toBe(500);
      expect(t1.zIndex).toBe(700 + 90);
      expect(container(view, "elements/home")).toBe(home);
      expect(container(view, "elements/t2")).toBe(t2);
    });

    it("only describes again what a patch touched", () => {
      const resolveElementSprite = vi.fn((_element: MapElement) => undefined);
      const { model } = setup({ hooks: { resolveElementSprite } });
      resolveElementSprite.mockClear();

      model.apply({ type: "element.move", id: "t1", x: 1, y: 1 });
      expect(resolveElementSprite).toHaveBeenCalledTimes(1);
      expect(resolveElementSprite.mock.calls[0]![0]).toMatchObject({ id: "t1" });

      resolveElementSprite.mockClear();
      model.apply({ type: "event.move", id: "chest-1", x: 1, y: 1 }); // not an element patch
      model.apply({ type: "extension.set", id: "x", value: 1 }); // nobody's business
      expect(resolveElementSprite).not.toHaveBeenCalled();
    });

    it("adds and removes elements", () => {
      const { model, view } = setup();
      model.apply({ type: "element.add", element: { id: "t3", kind: "tree", x: 10, y: 10 } });
      expect(container(view, "elements/t3")).toBeDefined();
      model.apply({ type: "element.remove", id: "t3" });
      expect(container(view, "elements/t3")).toBeUndefined();
      expect(view.describe().map((n) => n.id)).not.toContain("t3");
    });

    it("destroys what it removes", () => {
      const { model, view } = setup();
      const gone = container(view, "elements/t1")!;
      model.apply({ type: "element.remove", id: "t1" });
      expect(gone.destroyed).toBe(true);
    });

    it("re-describes an element whose kind, scale or depth changed", () => {
      const { model, view } = setup();
      model.apply({ type: "element.update", id: "t1", set: { scale: 2, depth: { z: 100 } } });
      const sprite = container(view, "elements/t1")!.children[0] as Sprite;
      expect([sprite.width, sprite.height]).toEqual([128, 192]);
      expect(container(view, "elements/t1")!.zIndex).toBe(96 + 90 * 2 + 100);

      model.apply({ type: "element.update", id: "t1", set: { kind: "house" } });
      expect((container(view, "elements/t1")!.children[0] as Sprite).width).toBe(256);
    });

    it("re-describes an element when its data changes, since hooks may read it", () => {
      const resolveElementSprite = vi.fn(() => undefined);
      const { model } = setup({ hooks: { resolveElementSprite } });
      resolveElementSprite.mockClear();
      model.apply({ type: "element.data", id: "t1", set: { hits: 3 } });
      expect(resolveElementSprite).toHaveBeenCalledTimes(1);
    });

    it("applies a batch as one update: the tree is cut and its loot appears together", () => {
      const { model, view } = setup();
      const seen: number[] = [];
      model.subscribe(() => seen.push(view.describe().length));
      model.apply([
        { type: "element.remove", id: "t1" },
        { type: "event.add", event: { id: "wood-1", kind: "loot", x: 128, y: 96, graphic: "wood" } },
      ]);
      expect(container(view, "elements/t1")).toBeUndefined();
      expect(container(view, "events/wood-1")).toBeDefined();
      expect(seen).toHaveLength(1);
    });

    it("follows undo and redo", () => {
      const { model, view } = setup();
      model.apply({ type: "element.move", id: "t1", x: 900, y: 900 });
      model.history.undo();
      expect((container(view, "elements/t1")!.children[0] as Sprite).x).toBe(128);
      model.history.redo();
      expect((container(view, "elements/t1")!.children[0] as Sprite).x).toBe(900);
    });

    it("follows a change made by someone else", () => {
      const { model, view } = setup();
      model.subscribe(() => undefined);
      model.apply({ type: "element.move", id: "t2", x: 1, y: 1 });
      expect((container(view, "elements/t2")!.children[0] as Sprite).x).toBe(1);
    });

    it("renders the parts a hook provides, and drops the ones that are no longer needed", () => {
      let count = 3;
      const resolveElementSprite = () => ({
        parts: Array.from({ length: count }, (_, index) => ({ x: index * 16, y: 0, width: 16, height: 16, frame: [0, 0, 16, 16] as const })),
      });
      const { model, view } = setup({ hooks: { resolveElementSprite } });
      expect(container(view, "elements/t1")!.children).toHaveLength(3);
      count = 1;
      model.apply({ type: "element.move", id: "t1", x: 1, y: 1 });
      expect(container(view, "elements/t1")!.children).toHaveLength(1);
    });
  });

  describe("textures", () => {
    it("hides a sprite until its image has loaded, then shows it", async () => {
      const textures = fakeTextures({ delayed: true });
      const { view } = setup({}, textures);
      const sprite = container(view, "elements/t1")!.children[0] as Sprite;
      expect(sprite.visible).toBe(false);

      textures.release();
      await view.whenIdle();
      expect(sprite.visible).toBe(true);
      expect(sprite.texture).not.toBe(Texture.EMPTY);
      expect([sprite.width, sprite.height]).toEqual([64, 96]);
    });

    it("hides a sprite whose image changes until the new image has loaded, instead of showing the old one at the wrong size", async () => {
      const textures = fakeTextures({ delayed: true });
      const { model, view } = setup({}, textures);
      textures.release();
      await view.whenIdle();
      const sprite = container(view, "elements/t1")!.children[0] as Sprite;
      expect(sprite.visible).toBe(true);

      // "wood" is an image nobody has loaded yet
      model.apply({ type: "element.update", id: "t1", set: { kind: "wood" } });
      expect(sprite.visible).toBe(false);
      textures.release();
      await view.whenIdle();
      expect(sprite.visible).toBe(true);
      expect(sprite.width).toBe(16);
    });

    it("loads each image once, however many elements use it", async () => {
      const { view, textures } = setup();
      await view.whenIdle();
      expect(textures.loads.filter((src) => src === "/tree.png")).toHaveLength(1);
    });

    it("shows only the frame of an image cut out of a larger one", async () => {
      const framed = defineAssets({ tile: { src: "/tileset.png", frame: [16, 8, 32, 16], size: [64, 32] } });
      const model = createMapModel(defineMap(framed, { id: "m", size: [100, 100], elements: [el("tile", { id: "a", x: 0, y: 0 })] }));
      const textures = fakeTextures({ sizes: { "/tileset.png": [256, 256] } });
      const view = createMapView({ model, assets: framed, features: [elements()], textures: textures.provider });
      await view.whenIdle();
      const sprite = container(view, "elements/a")!.children[0] as Sprite;
      expect(sprite.texture.frame.x).toBe(16);
      expect([sprite.texture.frame.width, sprite.texture.frame.height]).toEqual([32, 16]);
      expect([sprite.width, sprite.height]).toEqual([64, 32]);
    });

    it("measures an image that declares no size, then draws it", async () => {
      const model = createMapModel(defineMap(assets, { id: "m", size: [100, 100], elements: [el("unsized", { id: "u", x: 10, y: 20 })] }));
      const textures = fakeTextures({ delayed: true, sizes: { "/unsized.png": [40, 30] } });
      const view = createMapView({ model, assets, features: [elements()], textures: textures.provider });
      expect(view.describe()).toEqual([]); // nothing to draw until the size is known

      textures.release();
      await view.whenIdle();
      expect(view.describe()).toHaveLength(1);
      const sprite = container(view, "elements/u")!.children[0] as Sprite;
      expect([sprite.width, sprite.height]).toEqual([40, 30]);
    });

    it("reports an image that cannot be loaded, and keeps drawing the rest", async () => {
      const onError = vi.fn();
      const { view } = setup({ onError }, fakeTextures({ fail: ["/house.png"] }));
      await view.whenIdle();
      expect(onError).toHaveBeenCalledWith(expect.objectContaining({ code: "asset-load-failed", src: "/house.png" }));
      expect((container(view, "elements/t1")!.children[0] as Sprite).visible).toBe(true);
      expect((container(view, "elements/home")!.children[0] as Sprite).visible).toBe(false);
    });

    it("ignores a late image that no longer belongs to the sprite", async () => {
      const textures = fakeTextures({ delayed: true });
      const { model, view } = setup({}, textures);
      model.apply({ type: "element.remove", id: "t1" });
      expect(() => textures.release()).not.toThrow();
      await view.whenIdle();
      expect(container(view, "elements/t1")).toBeUndefined();
    });
  });

  describe("culling", () => {
    it("hides what is outside the viewport, margin included, and shows it again", () => {
      const { view } = setup({ cullingMargin: 0 });
      view.setViewport({ x: 0, y: 0, width: 400, height: 300 });
      expect(container(view, "elements/t1")!.visible).toBe(true);
      expect(container(view, "elements/home")!.visible).toBe(false);
      expect(container(view, "events/chest-1")!.visible).toBe(false);

      view.setViewport({ x: 600, y: 300, width: 400, height: 300 });
      expect(container(view, "elements/home")!.visible).toBe(true);
      expect(container(view, "elements/t1")!.visible).toBe(false);

      view.setViewport(null);
      expect(view.stages.objects.children.every((child) => child.visible)).toBe(true);
    });

    it("uses a margin so that objects overhanging the border are not cut off", () => {
      const { view } = setup({ cullingMargin: 100 });
      view.setViewport({ x: 0, y: 0, width: 100, height: 100 });
      expect(container(view, "elements/t1")!.visible).toBe(true); // at 128,96: within 100 of the border
      expect(container(view, "elements/home")!.visible).toBe(false);
    });

    it("applies the viewport to elements that appear or move afterwards", () => {
      const { model, view } = setup({ cullingMargin: 0 });
      view.setViewport({ x: 0, y: 0, width: 200, height: 200 });
      model.apply({ type: "element.add", element: { id: "far", kind: "tree", x: 1500, y: 1500 } });
      expect(container(view, "elements/far")!.visible).toBe(false);
      model.apply({ type: "element.move", id: "far", x: 10, y: 10 });
      expect(container(view, "elements/far")!.visible).toBe(true);
    });
  });

  describe("effects", () => {
    it("shakes an element, then puts it back, without touching the model", async () => {
      const { model, view } = setup();
      const t1 = container(view, "elements/t1")!;
      const before = model.state;
      const handle = view.effects.play("t1", "shake", { duration: 100, intensity: 10, frequency: 1 });

      view.tick(25);
      expect(t1.x).not.toBe(0);
      view.tick(75);
      expect(t1.x).toBe(0);
      expect(t1.alpha).toBe(1);
      await expect(handle.finished).resolves.toBe("completed");
      expect(model.state).toBe(before);
      expect(model.revision).toBe(0);
      expect(model.history.canUndo).toBe(false);
    });

    it("plays on events too, and combines with the position of the element", () => {
      const { view } = setup();
      view.effects.play({ type: "event", id: "chest-1" }, "blink", { duration: 100, strength: 1 });
      view.tick(50);
      expect(container(view, "events/chest-1")!.alpha).toBeCloseTo(0, 5);
    });

    it("keeps working after the element moves", () => {
      const { model, view } = setup();
      view.effects.play("t1", "shake", { duration: 1000, intensity: 10, frequency: 1 });
      view.tick(250);
      model.apply({ type: "element.move", id: "t1", x: 700, y: 700 });
      const t1 = container(view, "elements/t1")!;
      expect(t1.x).not.toBe(0);
      expect((t1.children[0] as Sprite).x).toBe(700);
    });

    it("stops when its element is removed", async () => {
      const { model, view } = setup();
      const handle = view.effects.play("t1", "shake");
      model.apply({ type: "element.remove", id: "t1" });
      await expect(handle.finished).resolves.toBe("target-removed");
      expect(view.effects.running).toBe(0);
    });

    it("never throws for an unknown effect or element", async () => {
      const { view } = setup();
      await expect(view.effects.play("t1", "nope").finished).resolves.toBe("unknown-effect");
      await expect(view.effects.play("ghost", "shake").finished).resolves.toBe("target-missing");
    });

    it("runs custom effects given in the options or registered later", () => {
      const lift = { duration: 100, update: (progress: number, _p: unknown, out: { offsetY: number }) => (out.offsetY -= 10 * progress) };
      const { view } = setup({ effects: { lift } });
      view.effects.play("t1", "lift");
      view.tick(50);
      expect(container(view, "elements/t1")!.y).toBe(-5);

      view.effects.register("drop", { duration: 100, update: (_p, _params, out) => (out.offsetY += 4) });
      view.effects.play("t2", "drop");
      view.tick(10);
      expect(container(view, "elements/t2")!.y).toBe(4);
    });

    it("clear cancels the running effects and restores the elements", () => {
      const { view } = setup();
      view.effects.play("t1", "shake", { duration: 1000, intensity: 10, frequency: 1 });
      view.tick(250);
      view.effects.clear();
      expect(container(view, "elements/t1")!.x).toBe(0);
      expect(view.effects.running).toBe(0);
    });
  });

  describe("features", () => {
    it("fails at startup when a feature needs another one that is missing, and says which", () => {
      const placement = defineMapFeature({ id: "placement", requires: ["elements"] });
      expect(() => setup({ features: [placement] })).toThrow(MapFeatureError);
      expect(() => setup({ features: [placement] })).toThrow('Feature "placement" requires "elements"');
      expect(() => setup({ features: [elements(), placement] })).not.toThrow();
    });

    it("refuses the same feature twice", () => {
      expect(() => setup({ features: [elements(), elements()] })).toThrow('Feature "elements" is listed twice');
    });

    it("refuses a feature built for another contract version", () => {
      const future = { ...elements(), apiVersion: 2 } as never;
      expect(() => setup({ features: [future] })).toThrow(/feature API version 2/);
    });

    it("draws what a third-party feature describes, with the same contract as the built-in ones", () => {
      const grid = defineMapFeature({
        id: "grid",
        render: {
          stage: "ground",
          describeAll: () => [
            { key: "grid/0", id: "0", type: "element", kind: "grid", stage: "ground", sortKey: 0, bounds: { x: 0, y: 0, width: 10, height: 10 }, parts: [{ key: "p", x: 0, y: 0, width: 10, height: 10, src: "/grid.png" }] },
          ],
          describeOne: () => undefined,
          affected: () => "none",
        },
      });
      const { view } = setup({ features: [grid] });
      expect(view.stages.ground.children).toHaveLength(1);
    });

    it("re-describes the whole feature for a patch it does not understand", () => {
      const calls = vi.fn();
      const tracker = defineMapFeature({
        id: "tracker",
        render: { stage: "overlay", describeAll: (...args) => (calls(...args), []), describeOne: () => undefined, affected: () => "all" },
      });
      const { model } = setup({ features: [tracker] });
      calls.mockClear();
      model.apply({ type: "element.move", id: "t1", x: 1, y: 1 });
      expect(calls).toHaveBeenCalledTimes(1);
    });
  });

  describe("missing assets", () => {
    it("reports an element whose asset nobody knows and carries on", () => {
      const onMissingAsset = vi.fn();
      const { model, view } = setup({ hooks: { onMissingAsset } });
      model.apply({ type: "element.add", element: { id: "odd", kind: "dragon", x: 0, y: 0 } });
      expect(onMissingAsset).toHaveBeenCalledWith("dragon", { type: "element", id: "odd" });
      expect(container(view, "elements/odd")).toBeUndefined();
      expect(container(view, "elements/t1")).toBeDefined();
    });
  });

  describe("lifecycle", () => {
    it("stops listening to the model once destroyed, and destroying twice is harmless", () => {
      const { model, view } = setup();
      view.destroy();
      view.destroy();
      expect(view.root.destroyed).toBe(true);
      expect(() => model.apply({ type: "element.move", id: "t1", x: 1, y: 1 })).not.toThrow();
    });

    it("ends the running effects when destroyed", () => {
      const { view } = setup();
      view.effects.play("t1", "shake");
      view.destroy();
      expect(view.effects.running).toBe(0);
    });
  });

  describe("mount", () => {
    const fakeApp = () => {
      const tickers: Array<(ticker: { deltaMS: number }) => void> = [];
      const app = {
        init: vi.fn(async () => undefined),
        canvas: { tag: "canvas" },
        stage: new Container(),
        ticker: {
          add: vi.fn((callback: (ticker: { deltaMS: number }) => void) => tickers.push(callback)),
          remove: vi.fn((callback: (ticker: { deltaMS: number }) => void) => tickers.splice(tickers.indexOf(callback), 1)),
        },
        destroy: vi.fn(),
      };
      return { app: app as unknown as PixiApplicationLike & typeof app, tickers };
    };

    it("creates the application in the host, with the root on the stage, and pixel-art friendly options", async () => {
      const { view } = setup();
      const { app } = fakeApp();
      const host = { appendChild: vi.fn() };
      await view.mount(host, { createApplication: () => app });

      expect(app.init).toHaveBeenCalledWith(expect.objectContaining({ resizeTo: host, antialias: false, backgroundAlpha: 0, autoDensity: true }));
      expect(host.appendChild).toHaveBeenCalledWith(app.canvas);
      expect(app.stage.children).toContain(view.root);
    });

    it("can paint a background", async () => {
      const { view } = setup();
      const { app } = fakeApp();
      await view.mount({ appendChild: vi.fn() }, { createApplication: () => app, background: "#112233" });
      expect(app.init).toHaveBeenCalledWith(expect.objectContaining({ background: "#112233", backgroundAlpha: 1 }));
    });

    it("drives the effects from the ticker of the application", async () => {
      const { view } = setup();
      const { app, tickers } = fakeApp();
      await view.mount({ appendChild: vi.fn() }, { createApplication: () => app });
      view.effects.play("t1", "blink", { duration: 100, strength: 1 });
      tickers[0]!({ deltaMS: 50 });
      expect(container(view, "elements/t1")!.alpha).toBeCloseTo(0, 5);
    });

    it("cannot be mounted twice", async () => {
      const { view } = setup();
      await view.mount({ appendChild: vi.fn() }, { createApplication: () => fakeApp().app });
      await expect(view.mount({ appendChild: vi.fn() }, { createApplication: () => fakeApp().app })).rejects.toThrow(/already mounted/);
    });

    it("removes its ticker and destroys the application when destroyed", async () => {
      const { view } = setup();
      const { app, tickers } = fakeApp();
      await view.mount({ appendChild: vi.fn() }, { createApplication: () => app });
      view.destroy();
      expect(tickers).toHaveLength(0);
      expect(app.destroy).toHaveBeenCalledWith(true);
    });

    it("destroys the application at once if the view was destroyed while it initialised", async () => {
      const { view } = setup();
      const { app } = fakeApp();
      const host = { appendChild: vi.fn() };
      const mounting = view.mount(host, { createApplication: () => app });
      view.destroy();
      await mounting;
      expect(app.destroy).toHaveBeenCalledWith(true);
      expect(host.appendChild).not.toHaveBeenCalled();
    });
  });
});

describe("attachMapView", () => {
  it("hosts the view in an existing container, and detaches it again", () => {
    const { view } = setup();
    const host = new Container();
    const detach = attachMapView(host, view);
    expect(host.children).toContain(view.root);
    detach();
    expect(host.children).not.toContain(view.root);
    detach(); // harmless twice
  });

  it("moves the view from the container that held it", () => {
    const { view } = setup();
    const first = new Container();
    const second = new Container();
    attachMapView(first, view);
    attachMapView(second, view);
    expect(first.children).not.toContain(view.root);
    expect(second.children).toContain(view.root);
  });

  it("does not detach a view that was moved elsewhere in the meantime", () => {
    const { view } = setup();
    const first = new Container();
    const second = new Container();
    const detachFirst = attachMapView(first, view);
    attachMapView(second, view);
    detachFirst();
    expect(second.children).toContain(view.root);
  });
});

describe("the same view works with any committer", () => {
  it("follows changes confirmed asynchronously", async () => {
    const { asyncCommitter } = await import("../model/__fixtures__");
    const model = createMapModel(forest(), { committer: asyncCommitter() });
    const view = createMapView({ model, assets, features: [elements()], textures: fakeTextures().provider });
    const patch: MapPatch = { type: "element.move", id: "t1", x: 321, y: 123 };
    await model.apply(patch);
    expect((container(view, "elements/t1")!.children[0] as Sprite).x).toBe(321);
  });
});

describe("a view that does not draw", () => {
  it("keeps what is on the map as something to pick, loads nothing and draws no sprite", async () => {
    const textures = fakeTextures();
    const { view } = setup({ draw: false }, textures);
    await view.whenIdle();
    expect(view.describe().map((node) => node.id).sort()).toEqual(["chest-1", "home", "t1", "t2"].sort());
    expect(textures.loads).toEqual([]);
    const sprites = (container: import("pixi.js").Container): number => container.children.reduce((count, child) => count + ("texture" in child ? 1 : 0) + sprites(child as import("pixi.js").Container), 0);
    expect(sprites(view.root)).toBe(0);
    // and the tools still work on it
    expect(view.interaction.pick({ x: 130, y: 120 })?.id).toBe("t1");
    view.destroy();
  });

  it("follows the model: what is added is described, what is removed is not", async () => {
    const { view, model } = setup({ draw: false });
    model.apply({ type: "element.remove", id: "t1" });
    expect(view.describe().some((node) => node.id === "t1")).toBe(false);
    view.destroy();
  });
});
