import { Application, Container, Sprite, Texture } from "pixi.js";
import type { AssetResolver } from "../model/assets";
import type { MapState } from "../model/definition";
import type { MapChange } from "../model/model";
import type { Unsubscribe } from "../model/result";
import {
  createEffectRunner,
  type EffectDefinition,
  type EffectHandle,
  type EffectOutput,
  type EffectParams,
} from "./effects";
import { validateFeatures, type FeatureRender, type MapFeature } from "./feature";
import { grow, intersects, type Rect } from "./geometry";
import {
  STAGE_ORDER,
  type DescribeContext,
  type MapViewHooks,
  type SceneNode,
  type ScenePart,
  type StageName,
} from "./scene";
import { createTextureStore, pixiTextureProvider, type TextureProvider } from "./textures";

/** What the view needs from a model. Any `MapModel` fits, whatever its committer. */
export interface ModelLike {
  readonly state: MapState;
  subscribe(listener: (change: MapChange) => void): Unsubscribe;
}

export type MapViewErrorCode = "asset-load-failed";

export interface MapViewError {
  readonly code: MapViewErrorCode;
  readonly message: string;
  readonly src: string;
  readonly cause: unknown;
}

/** The part of a PixiJS `Application` the view uses to mount itself. */
export interface PixiApplicationLike {
  init(options: Record<string, unknown>): Promise<void>;
  readonly canvas: unknown;
  readonly stage: Container;
  readonly ticker: { add(callback: (ticker: { deltaMS: number }) => void): unknown; remove(callback: (ticker: { deltaMS: number }) => void): unknown };
  destroy(removeView?: boolean, options?: unknown): void;
}

export interface MountOptions {
  /** CSS-style colour of the canvas background. Transparent by default. */
  readonly background?: string | number;
  /** Anti-aliasing is off by default: it blurs pixel art. */
  readonly antialias?: boolean;
  /** Replaces `new Application()`. */
  readonly createApplication?: () => PixiApplicationLike;
}

export interface MapViewOptions {
  readonly model: ModelLike;
  readonly assets: AssetResolver;
  /** What the view draws and how. Nothing is drawn without features. */
  readonly features: readonly MapFeature[];
  /** How images are loaded. Defaults to PixiJS `Assets`. */
  readonly textures?: TextureProvider;
  readonly hooks?: MapViewHooks;
  /** Extra effects, by name, next to the built-in `shake` and `blink`. */
  readonly effects?: Readonly<Record<string, EffectDefinition>>;
  /** Margin, in pixels, added around the viewport before something is hidden. Defaults to 64. */
  readonly cullingMargin?: number;
  /** Receives non-fatal problems. Defaults to `console.warn`, once per image. */
  readonly onError?: (error: MapViewError) => void;
}

/** An element or event, as an effect target. A plain string is an element id. */
export type EffectTarget = string | { readonly type: "element" | "event"; readonly id: string };

export interface MapViewEffects {
  /**
   * Plays a short visual effect. It does not touch the model, so it is neither
   * persisted nor undoable. It never throws: see the status of `handle.finished`.
   */
  play(target: EffectTarget, name: string, params?: EffectParams): EffectHandle;
  register(name: string, definition: EffectDefinition): void;
  clear(target?: EffectTarget): void;
  readonly running: number;
}

export interface MapView {
  /** Add this to any PixiJS stage (a `Application`, a CanvasEngine scene). */
  readonly root: Container;
  /** One container per stage, back to front. */
  readonly stages: Readonly<Record<StageName, Container>>;
  readonly effects: MapViewEffects;
  /**
   * Restricts drawing to a world rectangle (usually the camera view). What is
   * outside, margin included, is hidden. `null` shows everything.
   */
  setViewport(viewport: Rect | null): void;
  /** Advances time. `mount` calls it every frame; call it yourself when you host `root`. */
  tick(deltaMs: number): void;
  /** Creates a PixiJS application in `host` and draws into it. */
  mount(host: { appendChild(node: never): unknown }, options?: MountOptions): Promise<void>;
  /** Resolves once every image requested so far has loaded (or failed). */
  whenIdle(): Promise<void>;
  /** The nodes currently in the scene, as plain data. Useful for tests and tools. */
  describe(): readonly SceneNode[];
  destroy(): void;
}

interface PartSprite {
  readonly sprite: Sprite;
  part: ScenePart;
}

interface NodeView {
  node: SceneNode;
  readonly container: Container;
  readonly sprites: Map<string, PartSprite>;
  readonly owner: FeatureRender;
}

const sameFrame = (a: ScenePart["frame"], b: ScenePart["frame"]): boolean =>
  a === b || (a !== undefined && b !== undefined && a.every((value, index) => value === b[index]));

export function createMapView(options: MapViewOptions): MapView {
  validateFeatures(options.features);
  const renders = options.features.flatMap((feature) => (feature.render ? [feature.render] : []));

  const root = new Container();
  root.label = "map-view";
  const stages = Object.fromEntries(
    STAGE_ORDER.map((name) => {
      const stage = new Container();
      stage.label = name;
      root.addChild(stage);
      return [name, stage];
    }),
  ) as Record<StageName, Container>;
  // Elements are drawn in depth order: the higher the sort key, the closer to the viewer.
  stages.objects.sortableChildren = true;

  const store = createTextureStore(options.textures ?? pixiTextureProvider);
  const views = new Map<string, NodeView>();
  const warned = new Set<string>();
  const pending = new Set<Promise<unknown>>();
  let viewport: Rect | null = null;
  let destroyed = false;
  let mounted: { app: PixiApplicationLike; tick: (ticker: { deltaMS: number }) => void } | null = null;

  const reportError = (error: MapViewError): void => {
    if (options.onError) options.onError(error);
    else if (!warned.has(error.src)) {
      warned.add(error.src);
      console.warn(`[map-builder] ${error.message}`);
    }
  };

  const track = (promise: Promise<unknown>): void => {
    pending.add(promise);
    void promise.finally(() => pending.delete(promise));
  };

  // Sizes of images that no asset declares are read from the loaded image, then the scene is described again.
  const requestedSizes = new Set<string>();
  const measure = (src: string): readonly [number, number] | undefined => {
    const size = store.size(src);
    if (!size && !requestedSizes.has(src)) {
      requestedSizes.add(src);
      track(
        store.ready(src).then(
          () => {
            if (!destroyed) resyncAll(options.model.state);
          },
          (cause) => reportError({ code: "asset-load-failed", message: `Could not load "${src}"`, src, cause }),
        ),
      );
    }
    return size;
  };

  const context: DescribeContext = {
    assets: options.assets,
    ...(options.hooks ? { hooks: options.hooks } : {}),
    measure,
  };

  const isVisible = (node: SceneNode): boolean =>
    viewport === null || intersects(node.bounds, grow(viewport, options.cullingMargin ?? 64));

  const applyPart = (entry: PartSprite, part: ScenePart): void => {
    entry.sprite.position.set(part.x, part.y);
    entry.sprite.width = part.width;
    entry.sprite.height = part.height;
  };

  const loadPart = (nodeKey: string, entry: PartSprite, part: ScenePart): void => {
    const texture = store.get(part.src, part.frame);
    if (texture) {
      entry.sprite.texture = texture;
      entry.sprite.visible = true;
      applyPart(entry, part);
      return;
    }
    entry.sprite.visible = false;
    track(
      store.ready(part.src, part.frame).then(
        (loaded) => {
          const view = views.get(nodeKey);
          const current = view?.sprites.get(part.key);
          if (!current || current !== entry || current.part.src !== part.src || !sameFrame(current.part.frame, part.frame)) return;
          entry.sprite.texture = loaded;
          entry.sprite.visible = true;
          applyPart(entry, current.part);
        },
        (cause) => reportError({ code: "asset-load-failed", message: `Could not load "${part.src}"`, src: part.src, cause }),
      ),
    );
  };

  const upsert = (owner: FeatureRender, node: SceneNode): void => {
    let view = views.get(node.key);
    if (!view) {
      const container = new Container();
      container.label = node.key;
      stages[node.stage].addChild(container);
      view = { node, container, sprites: new Map(), owner };
      views.set(node.key, view);
    } else if (view.node.stage !== node.stage) {
      stages[node.stage].addChild(view.container);
    }

    view.node = node;
    view.container.zIndex = node.sortKey;
    view.container.visible = isVisible(node);

    const keep = new Set(node.parts.map((part) => part.key));
    for (const [key, entry] of view.sprites) {
      if (keep.has(key)) continue;
      entry.sprite.destroy();
      view.sprites.delete(key);
    }
    for (const part of node.parts) {
      let entry = view.sprites.get(part.key);
      if (!entry) {
        const sprite = new Sprite(Texture.EMPTY);
        sprite.visible = false;
        view.container.addChild(sprite);
        entry = { sprite, part };
        view.sprites.set(part.key, entry);
        loadPart(node.key, entry, part);
      } else if (entry.part.src !== part.src || !sameFrame(entry.part.frame, part.frame)) {
        entry.part = part;
        loadPart(node.key, entry, part);
      } else {
        entry.part = part;
      }
      applyPart(entry, part);
    }
  };

  const remove = (key: string): void => {
    const view = views.get(key);
    if (!view) return;
    runner.targetRemoved(key);
    view.container.destroy({ children: true });
    views.delete(key);
  };

  const refresh = (owner: FeatureRender, id: string, state: MapState): void => {
    const node = owner.describeOne(state, id, context);
    if (node) upsert(owner, node);
    else for (const [key, view] of views) if (view.owner === owner && view.node.id === id) remove(key);
  };

  const resync = (owner: FeatureRender, state: MapState): void => {
    const nodes = owner.describeAll(state, context);
    const live = new Set(nodes.map((node) => node.key));
    for (const [key, view] of views) if (view.owner === owner && !live.has(key)) remove(key);
    for (const node of nodes) upsert(owner, node);
  };

  function resyncAll(state: MapState): void {
    for (const owner of renders) resync(owner, state);
  }

  const targetKey = (target: EffectTarget): string =>
    typeof target === "string" ? `elements/${target}` : `${target.type}s/${target.id}`;

  const runner = createEffectRunner({
    exists: (key) => views.has(key),
    apply(key, output: EffectOutput | null) {
      const view = views.get(key);
      if (!view) return;
      view.container.position.set(output?.offsetX ?? 0, output?.offsetY ?? 0);
      view.container.alpha = output?.alpha ?? 1;
    },
    onWarning: (message) => console.warn(`[map-builder] ${message}`),
  });
  for (const [name, definition] of Object.entries(options.effects ?? {})) runner.register(name, definition);

  const unsubscribe = options.model.subscribe((change) => {
    if (destroyed) return;
    const touched = new Map<FeatureRender, Set<string> | "all">();
    for (const patch of change.patches) {
      for (const owner of renders) {
        const affected = owner.affected(patch);
        if (affected === "none") continue;
        const current = touched.get(owner);
        if (affected === "all") touched.set(owner, "all");
        else if (current !== "all") {
          const ids = current ?? new Set<string>();
          for (const id of affected) ids.add(id);
          touched.set(owner, ids);
        }
      }
    }
    for (const [owner, ids] of touched) {
      if (ids === "all") resync(owner, change.state);
      else for (const id of ids) refresh(owner, id, change.state);
    }
  });

  resyncAll(options.model.state);

  return {
    root,
    stages,
    effects: {
      play: (target, name, params) => runner.play(targetKey(target), name, params),
      register: (name, definition) => runner.register(name, definition),
      clear: (target) => runner.clear(target === undefined ? undefined : targetKey(target)),
      get running() {
        return runner.running;
      },
    },
    setViewport(next) {
      viewport = next;
      for (const view of views.values()) view.container.visible = isVisible(view.node);
    },
    tick: (deltaMs) => runner.tick(deltaMs),
    async mount(host, mountOptions = {}) {
      if (mounted) throw new Error("The view is already mounted");
      const app = mountOptions.createApplication?.() ?? (new Application() as unknown as PixiApplicationLike);
      await app.init({
        resizeTo: host,
        backgroundAlpha: mountOptions.background === undefined ? 0 : 1,
        ...(mountOptions.background !== undefined ? { background: mountOptions.background } : {}),
        antialias: mountOptions.antialias ?? false,
        autoDensity: true,
      });
      if (destroyed) {
        app.destroy(true);
        return;
      }
      host.appendChild(app.canvas as never);
      app.stage.addChild(root);
      const tick = (ticker: { deltaMS: number }): void => runner.tick(ticker.deltaMS);
      app.ticker.add(tick);
      mounted = { app, tick };
    },
    async whenIdle() {
      while (pending.size > 0) await Promise.allSettled([...pending]);
    },
    describe: () => [...views.values()].map((view) => view.node),
    destroy() {
      if (destroyed) return;
      destroyed = true;
      unsubscribe();
      runner.clear();
      if (mounted) {
        mounted.app.ticker.remove(mounted.tick);
        mounted.app.destroy(true);
        mounted = null;
      }
      root.destroy({ children: true });
      views.clear();
      store.destroy();
    },
  };
}

/**
 * Hosts a view in an existing PixiJS container, typically the `componentInstance`
 * of a CanvasEngine component. Returns the function that detaches it again, which
 * is what the `mount` hook of CanvasEngine expects to return.
 *
 * ```ce
 * <Container />
 *
 * <script>
 *   import { mount, tick } from "canvasengine";
 *   import { attachMapView } from "@rpgjs/map-builder/renderer";
 *
 *   mount((element) => attachMapView(element.componentInstance, view));
 *   tick(({ deltaTime }) => view.tick(deltaTime));
 * </script>
 * ```
 */
export function attachMapView(container: Container, view: Pick<MapView, "root">): () => void {
  if (view.root.parent && view.root.parent !== container) view.root.parent.removeChild(view.root);
  container.addChild(view.root);
  return () => {
    if (view.root.parent === container) container.removeChild(view.root);
  };
}
