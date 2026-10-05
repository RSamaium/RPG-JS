import type { AssetResolver } from "../model/assets";
import type { MapState } from "../model/definition";
import type { MapHistory } from "../model/history";
import type { MapChange } from "../model/model";
import type { MapPatch } from "../model/patches";
import type { ApplyFailure, ApplyResult, MaybePromise, Unsubscribe } from "../model/result";
import type { Rect } from "../renderer/geometry";
import type { DescribeContext, SceneNode } from "../renderer/scene";
import type { Footprint, IntentContext, IntentDefinition, IntentOf, IntentType, MapIntent, Rejection } from "./intents";
import type { KeyInput, PointerInput } from "./input";
import { pickNode, pickNodes, sameTarget, targetOf, type PickOptions, type Point, type TargetRef } from "./picking";
import { runPipeline, type PipelineContext, type PipelineResult, type PipelineStep } from "./pipeline";
import { createStore, type Store } from "./store";

export interface DragState {
  readonly targets: readonly TargetRef[];
  readonly origin: Point;
  readonly delta: Point;
  /** False when the pipeline refuses where the targets would land. */
  readonly valid: boolean;
  readonly reason?: string;
  /** True when the model follows the pointer while dragging, false when it changes only on drop. */
  readonly live: boolean;
}

export interface GhostState {
  readonly catalogId: string;
  /** Asset drawn by the ghost. */
  readonly kind: string;
  /** Where it would be placed, after the pipeline (snapped…). */
  readonly x: number;
  readonly y: number;
  readonly valid: boolean;
  readonly reason?: string;
  readonly bounds?: Rect;
  readonly hitbox?: Rect;
}

/** Everything the interaction layer publishes. Skins and UIs read it; nothing here is drawn. */
export interface InteractionSnapshot {
  readonly modes: readonly string[];
  readonly hovered: TargetRef | null;
  readonly selection: readonly TargetRef[];
  readonly drag: DragState | null;
  /** Rubber-band rectangle of a selection in progress. */
  readonly marquee: Rect | null;
  /** Id of the catalog item being placed, once `placement.start` was called. */
  readonly placing: string | null;
  /** Where the item being placed would land. Absent until the pointer has moved. */
  readonly ghost: GhostState | null;
  /** The last intent that was refused, and why, so the UI can tell the user. */
  readonly lastRejection: (Rejection & { readonly intent: MapIntent }) | null;
}

/** The part of a model the interaction layer needs. Any `MapModel` fits. */
export interface ModelApi<R extends MaybePromise<ApplyResult> = MaybePromise<ApplyResult>> {
  readonly state: MapState;
  subscribe(listener: (change: MapChange) => void): Unsubscribe;
  apply(input: MapPatch | readonly MapPatch[], options?: { readonly coalesce?: string }): R;
  /** Used to take back a drag that applied its moves as it went. */
  readonly history?: MapHistory<R>;
}

export interface Tool {
  readonly id: string;
  /** The tool is active while one of these modes is. */
  readonly modes: readonly string[];
  /** Tools with a higher priority see events first. Defaults to 0. */
  readonly priority?: number;
  /** Gate: the tool only reacts to events for which this is true, e.g. a modifier key. */
  readonly when?: (input: PointerInput | KeyInput) => boolean;
  /** Return `true` to take the event: the tool then also gets the moves and the release. */
  pointerDown?(input: PointerInput, controller: InteractionController): boolean | void;
  pointerMove?(input: PointerInput, controller: InteractionController): boolean | void;
  pointerUp?(input: PointerInput, controller: InteractionController): void;
  key?(input: KeyInput, controller: InteractionController): boolean | void;
  /** The tool stops being active (mode change, `controller.cancel()`): drop what is in progress. */
  cancel?(controller: InteractionController): void;
}

export interface SubmitOptions {
  /** Consecutive submissions with the same key become one undo step. */
  readonly coalesce?: string;
}

export interface PreviewOptions {
  /** Targets to leave out of the obstacles, e.g. those being moved. */
  readonly ignore?: readonly TargetRef[];
}

export interface InteractionController<R extends MaybePromise<ApplyResult> = MaybePromise<ApplyResult>> {
  readonly state: Store<InteractionSnapshot>;
  readonly model: ModelApi<R>;
  readonly assets: AssetResolver;
  readonly describeContext: DescribeContext;
  readonly modes: readonly string[];
  /** Replaces the active modes. Tools of a mode that is no longer active are cancelled. */
  setModes(modes: readonly string[]): void;
  readonly tools: readonly Tool[];
  addTool(tool: Tool): Unsubscribe;
  registerIntent<K extends IntentType>(type: K, definition: IntentDefinition<K>): Unsubscribe;
  hasIntent(type: IntentType): boolean;
  /** Adds steps to the chain an intent goes through. Steps run in the order they were added. */
  usePipeline<K extends IntentType>(type: K, steps: readonly PipelineStep<K>[]): Unsubscribe;
  /** Runs the pipeline only, without changing anything: what the ghost and the drag preview use. */
  preview<K extends IntentType>(intent: IntentOf<K>, options?: PreviewOptions): PipelineResult<K>;
  /**
   * Turns intents into patches through the pipeline and applies them. Several
   * intents are applied as one atomic batch. A refusal comes back as a failure
   * whose `rejection.code` is the reason, and is kept in `state.lastRejection`.
   */
  submit(intent: MapIntent | readonly MapIntent[], options?: SubmitOptions): R | ApplyFailure;
  /** What is drawn right now. */
  nodes(): readonly SceneNode[];
  pick(point: Point, options?: PickOptions): SceneNode | undefined;
  pickAll(point: Point, options?: PickOptions): SceneNode[];
  /** Last known pointer position in world coordinates. */
  readonly pointer: Point | null;
  feedPointer(kind: "down" | "move" | "up", input: PointerInput): boolean;
  feedKey(input: KeyInput): boolean;
  /** Cancels whatever is in progress: a drag, a placement. */
  cancel(): void;
  destroy(): void;
}

export interface InteractionOptions<R extends MaybePromise<ApplyResult>> {
  readonly model: ModelApi<R>;
  readonly assets: AssetResolver;
  readonly describe: DescribeContext;
  /** What is drawn right now. */
  readonly nodes: () => readonly SceneNode[];
  /** Who is acting, handed to the steps of the pipeline. */
  readonly actor?: () => unknown;
  /** Active modes at the start. Defaults to `["edit"]`. */
  readonly modes?: readonly string[];
  readonly onError?: (error: unknown) => void;
}

const unique = (targets: readonly TargetRef[]): TargetRef[] =>
  targets.filter((target, index) => targets.findIndex((other) => sameTarget(other, target)) === index);

const exists = (state: MapState, target: TargetRef): boolean =>
  (target.type === "element" ? state.elements : state.events).some((entry) => entry.id === target.id);

export function createInteraction<R extends MaybePromise<ApplyResult>>(options: InteractionOptions<R>): InteractionController<R> {
  const reportError = options.onError ?? ((error: unknown) => console.error(error));
  const store = createStore<InteractionSnapshot>(
    {
      modes: [...(options.modes ?? ["edit"])],
      hovered: null,
      selection: [],
      drag: null,
      marquee: null,
      placing: null,
      ghost: null,
      lastRejection: null,
    },
    reportError,
  );

  const tools: Tool[] = [];
  const intents = new Map<string, IntentDefinition<IntentType>>();
  const pipelines = new Map<string, PipelineStep<IntentType>[]>();
  let captured: Tool | null = null;
  let lastPointer: Point | null = null;
  let destroyed = false;

  const isActive = (tool: Tool): boolean => tool.modes.some((mode) => store.get().modes.includes(mode));
  const ordered = (): Tool[] => [...tools].sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));

  const intentContext = (): IntentContext => ({
    state: options.model.state,
    assets: options.assets,
    describe: options.describe,
    actor: options.actor?.(),
  });

  const footprintOf = (intent: IntentOf<IntentType>): Footprint | undefined =>
    intents.get(intent.type)?.footprint?.(intent as never, intentContext());

  const pipelineContext = (nodes: readonly SceneNode[]): PipelineContext => ({
    state: options.model.state,
    assets: options.assets,
    nodes,
    actor: options.actor?.(),
    footprint: footprintOf,
    reject: (reason, message) => ({ ok: false, reason, ...(message !== undefined ? { message } : {}) }),
  });

  const refuse = (rejection: Rejection, intent: MapIntent, patchIndex?: number): ApplyFailure => {
    store.update({ lastRejection: { ...rejection, intent } });
    return {
      ok: false,
      rejection: {
        code: rejection.reason,
        message: rejection.message ?? rejection.reason,
        ...(patchIndex !== undefined ? { patchIndex } : {}),
      },
    };
  };

  const stepsFor = (type: IntentType): readonly PipelineStep<IntentType>[] => pipelines.get(type) ?? [];

  const controller: InteractionController<R> = {
    state: store,
    model: options.model,
    assets: options.assets,
    describeContext: options.describe,
    get modes() {
      return store.get().modes;
    },
    setModes(modes) {
      const next = [...new Set(modes)];
      const before = store.get().modes;
      if (next.length === before.length && next.every((mode, index) => mode === before[index])) return;
      store.update({ modes: next });
      for (const tool of tools) {
        if (!isActive(tool)) {
          if (captured === tool) captured = null;
          tool.cancel?.(controller);
        }
      }
    },
    get tools() {
      return tools;
    },
    addTool(tool) {
      if (tools.some((other) => other.id === tool.id)) throw new Error(`A tool with the id "${tool.id}" already exists`);
      tools.push(tool);
      return () => {
        const index = tools.indexOf(tool);
        if (index >= 0) tools.splice(index, 1);
        if (captured === tool) captured = null;
        tool.cancel?.(controller);
      };
    },
    registerIntent(type, definition) {
      if (intents.has(type)) throw new Error(`Intent "${type}" is already registered`);
      intents.set(type, definition as unknown as IntentDefinition<IntentType>);
      return () => intents.delete(type);
    },
    hasIntent: (type) => intents.has(type),
    usePipeline(type, steps) {
      const list = pipelines.get(type) ?? [];
      list.push(...(steps as unknown as PipelineStep<IntentType>[]));
      pipelines.set(type, list);
      return () => {
        const current = pipelines.get(type);
        if (!current) return;
        pipelines.set(type, current.filter((step) => !(steps as readonly unknown[]).includes(step)));
      };
    },
    preview(intent, previewOptions = {}) {
      const ignore = previewOptions.ignore ?? [];
      const nodes = options.nodes().filter((node) => !ignore.some((target) => sameTarget(target, targetOf(node))));
      return runPipeline(stepsFor(intent.type) as unknown as readonly PipelineStep<typeof intent.type>[], intent, pipelineContext(nodes));
    },
    submit(input, submitOptions) {
      const list: readonly MapIntent[] = Array.isArray(input) ? (input as readonly MapIntent[]) : [input as MapIntent];
      // Elements moved or removed together do not block one another.
      const leaving: TargetRef[] = list.flatMap((intent) =>
        intent.type === "element.move" || intent.type === "element.remove" ? [{ type: "element" as const, id: intent.id }] : [],
      );
      const nodes = options.nodes().filter((node) => !leaving.some((target) => sameTarget(target, targetOf(node))));
      const context = pipelineContext(nodes);

      const patches: MapPatch[] = [];
      for (const [index, intent] of list.entries()) {
        const definition = intents.get(intent.type);
        if (!definition) return refuse({ ok: false, reason: "unknown-intent", message: `No intent "${intent.type}"` }, intent, index);

        const result = runPipeline(stepsFor(intent.type) as unknown as readonly PipelineStep<typeof intent.type>[], intent, context);
        if (!result.ok) return refuse(result, intent, index);

        const resolved = definition.resolve(result.intent as never, intentContext());
        if (typeof resolved === "object" && resolved !== null && "ok" in resolved && resolved.ok === false) {
          return refuse(resolved, intent, index);
        }
        patches.push(...(Array.isArray(resolved) ? (resolved as MapPatch[]) : [resolved as MapPatch]));
      }

      store.update({ lastRejection: null });
      return options.model.apply(patches.length === 1 ? patches[0]! : patches, submitOptions);
    },
    nodes: () => options.nodes(),
    pick: (point, pickOptions) => pickNode(options.nodes(), point, pickOptions),
    pickAll: (point, pickOptions) => pickNodes(options.nodes(), point, pickOptions),
    get pointer() {
      return lastPointer;
    },
    feedPointer(kind, input) {
      if (destroyed) return false;
      lastPointer = { x: input.x, y: input.y };
      const run = (tool: Tool): boolean | void => {
        if (tool.when && !tool.when(input)) return false;
        return kind === "down" ? tool.pointerDown?.(input, controller) : kind === "move" ? tool.pointerMove?.(input, controller) : undefined;
      };

      if (kind === "up") {
        const tool = captured;
        captured = null;
        tool?.pointerUp?.(input, controller);
        return tool !== null;
      }
      if (captured && kind === "move") {
        captured.pointerMove?.(input, controller);
        return true;
      }
      for (const tool of ordered()) {
        if (!isActive(tool)) continue;
        if (run(tool) === true) {
          if (kind === "down") captured = tool;
          return true;
        }
      }
      return false;
    },
    feedKey(input) {
      if (destroyed) return false;
      for (const tool of ordered()) {
        if (!isActive(tool) || (tool.when && !tool.when(input))) continue;
        if (tool.key?.(input, controller) === true) return true;
      }
      return false;
    },
    cancel() {
      captured = null;
      for (const tool of tools) tool.cancel?.(controller);
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      unsubscribe();
      controller.cancel();
      tools.length = 0;
      intents.clear();
      pipelines.clear();
    },
  };

  // What no longer exists can neither be selected, hovered nor dragged.
  const unsubscribe = options.model.subscribe(() => {
    const snapshot = store.get();
    const state = options.model.state;
    const selection = snapshot.selection.filter((target) => exists(state, target));
    store.update({
      ...(selection.length !== snapshot.selection.length ? { selection } : {}),
      ...(snapshot.hovered && !exists(state, snapshot.hovered) ? { hovered: null } : {}),
      ...(snapshot.drag && snapshot.drag.targets.some((target) => !exists(state, target)) ? { drag: null } : {}),
    });
  });

  return controller;
}

export { unique as uniqueTargets };
