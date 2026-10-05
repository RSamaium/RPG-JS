import { Application, Container, Rectangle, Sprite, Texture } from "pixi.js";
import type { AssetResolver } from "../model/assets";
import type { MapState } from "../model/definition";
import type { ApplyResult, MaybePromise, Unsubscribe } from "../model/result";
import { bindKeyboard, type KeyTarget } from "../interaction/keyboard";
import { createInteraction, type InteractionController, type ModelApi } from "../interaction/controller";
import type { PointerInput } from "../interaction/input";
import {
  createEffectRunner,
  type EffectDefinition,
  type EffectHandle,
  type EffectOutput,
  type EffectParams,
} from "./effects";
import { validateFeatures, type FeatureApis, type FeatureHost, type FeatureRender, type MapFeature } from "./feature";
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
  /**
   * Listen to the keyboard (Escape, Delete…) and give it to the interaction layer.
   * `true` listens on the page, or give an event target. Off by default.
   */
  readonly keyboard?: boolean | KeyTarget;
  /** CSS-style colour of the canvas background. Transparent by default. */
  readonly background?: string | number;
  /** Anti-aliasing is off by default: it blurs pixel art. */
  readonly antialias?: boolean;
  /** Replaces `new Application()`. */
  readonly createApplication?: () => PixiApplicationLike;
}

export interface MapViewOptions<
  F extends readonly MapFeature<string, object>[] = readonly MapFeature<string, object>[],
  R extends MaybePromise<ApplyResult> = MaybePromise<ApplyResult>,
> {
  /** Any `MapModel` fits, whatever its committer. */
  readonly model: ModelApi<R>;
  readonly assets: AssetResolver;
  /** What the view draws and how. Nothing is drawn without features. */
  readonly features: F;
  /** Who is acting, handed to the steps of the pipelines. Whatever the game decides. */
  readonly actor?: () => unknown;
  /** Modes active at the start. Tools belong to modes (`play`, `edit`, `inspect`). Defaults to `["edit"]`. */
  readonly modes?: readonly string[];
  /**
   * Turn pointer events on the map into interaction. Defaults to true as soon as a
   * feature has something to interact with, false otherwise: a view that only
   * draws never gets in the way of the clicks of a game.
   */
  readonly interactive?: boolean;
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

export interface MapView<R extends MaybePromise<ApplyResult> = MaybePromise<ApplyResult>> {
  /** Add this to any PixiJS stage (a `Application`, a CanvasEngine scene). */
  readonly root: Container;
  /** The headless layer: modes, tools, selection, pipelines. Observable through `interaction.state`. */
  readonly interaction: InteractionController<R>;
  /** Asks for something to be done: runs the pipeline, then applies. See {@link InteractionController.submit}. */
  readonly submit: InteractionController<R>["submit"];
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

export function createMapView<
  const F extends readonly MapFeature<string, object>[],
  R extends MaybePromise<ApplyResult> = ApplyResult,
>(options: MapViewOptions<F, R>): MapView<R> & FeatureApis<F> {
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
  let mounted: { app: PixiApplicationLike; tick: (ticker: { deltaMS: number }) => void; unbindKeyboard: (() => void) | undefined } | null = null;

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
    if (change.reset) {
      // A snapshot replaced the whole state: nothing derived from the old one can be trusted.
      resyncAll(change.state);
      return;
    }
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

  const sceneNodes = (): readonly SceneNode[] => [...views.values()].map((view) => view.node);

  const interaction = createInteraction<R>({
    model: options.model,
    assets: options.assets,
    describe: context,
    nodes: sceneNodes,
    ...(options.actor ? { actor: options.actor } : {}),
    ...(options.modes ? { modes: options.modes } : {}),
  });

  const tickListeners = new Set<(deltaMs: number) => void>();
  const advance = (deltaMs: number): void => {
    runner.tick(deltaMs);
    for (const listener of [...tickListeners]) listener(deltaMs);
  };

  // Pointer events on the map become interaction, but only when something is there to interact with:
  // a view that just draws must never get in the way of the clicks of a game.
  const interactive = options.interactive ?? options.features.some((feature) => feature.setup !== undefined);
  if (interactive) {
    const [width, height] = options.model.state.size;
    root.eventMode = "static";
    root.hitArea = new Rectangle(0, 0, width, height);
    const toInput = (event: PointerEventLike): PointerInput => {
      const point = event.getLocalPosition(root);
      return {
        x: point.x,
        y: point.y,
        button: event.button ?? 0,
        modifiers: { shift: !!event.shiftKey, ctrl: !!event.ctrlKey, alt: !!event.altKey, meta: !!event.metaKey },
      };
    };
    root.on("pointerdown", (event: PointerEventLike) => interaction.feedPointer("down", toInput(event)));
    // `globalpointermove` keeps a drag going when the pointer leaves the map.
    root.on("globalpointermove", (event: PointerEventLike) => interaction.feedPointer("move", toInput(event)));
    root.on("pointerup", (event: PointerEventLike) => interaction.feedPointer("up", toInput(event)));
    root.on("pointerupoutside", (event: PointerEventLike) => interaction.feedPointer("up", toInput(event)));
  }

  const instances: Array<{ dispose?(): void }> = [];

  const view: MapView<R> = {
    root,
    stages,
    interaction,
    submit: (intent, submitOptions) => interaction.submit(intent, submitOptions),
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
      for (const nodeView of views.values()) nodeView.container.visible = isVisible(nodeView.node);
    },
    tick: advance,
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
      const tick = (ticker: { deltaMS: number }): void => advance(ticker.deltaMS);
      app.ticker.add(tick);
      const keyboardTarget = mountOptions.keyboard === true ? (globalThis as unknown as KeyTarget) : mountOptions.keyboard || undefined;
      mounted = { app, tick, unbindKeyboard: keyboardTarget ? bindKeyboard(interaction, keyboardTarget) : undefined };
    },
    async whenIdle() {
      while (pending.size > 0) await Promise.allSettled([...pending]);
    },
    describe: sceneNodes,
    destroy() {
      if (destroyed) return;
      destroyed = true;
      unsubscribe();
      for (const instance of instances) instance.dispose?.();
      interaction.destroy();
      runner.clear();
      tickListeners.clear();
      if (mounted) {
        mounted.unbindKeyboard?.();
        mounted.app.ticker.remove(mounted.tick);
        mounted.app.destroy(true);
        mounted = null;
      }
      root.destroy({ children: true });
      views.clear();
      store.destroy();
    },
  };

  const host: FeatureHost<R> = {
    model: options.model,
    assets: options.assets,
    interaction,
    stages,
    textures: store,
    describe: sceneNodes,
    onTick(listener) {
      tickListeners.add(listener);
      return () => tickListeners.delete(listener);
    },
  };
  // Features are set up in the order they are listed, after the model has already been drawn.
  for (const feature of options.features) {
    const instance = feature.setup?.(host as unknown as FeatureHost);
    if (!instance) continue;
    instances.push(instance);
    if (instance.api) Object.defineProperty(view, feature.id, { value: instance.api, enumerable: true });
  }

  return view as MapView<R> & FeatureApis<F>;
}

/** The part of a PixiJS federated pointer event that is used. */
interface PointerEventLike {
  readonly button?: number;
  readonly shiftKey?: boolean;
  readonly ctrlKey?: boolean;
  readonly altKey?: boolean;
  readonly metaKey?: boolean;
  getLocalPosition(target: Container): { x: number; y: number };
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
