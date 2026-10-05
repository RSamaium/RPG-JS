import type { Unsubscribe } from "../model/result";
import type { ApplyResult, MaybePromise } from "../model/result";
import { describeElement } from "../renderer/scene";
import type { Catalog, CatalogId, CatalogItem } from "./catalog";
import type { InteractionController, Tool } from "./controller";
import type { KeyInput, PointerInput } from "./input";
import type { Footprint, IntentDefinition } from "./intents";
import { runPipeline, type PipelineStep } from "./pipeline";
import type { Point } from "./picking";

export type PlacementAnchor = "top-left" | "center" | "bottom-center";

export interface PlacementOptions<C extends Catalog<string>> {
  readonly catalog: C;
  /** Rules every item goes through, before its own. Typically `[snapToGrid(32), withinMap(), requireFree()]`. */
  readonly pipeline?: readonly PipelineStep<"element.place">[];
  /** Which point of the item follows the pointer. Defaults to `"center"`. */
  readonly anchor?: PlacementAnchor;
  /** Stay in placement mode after an item was placed. Defaults to false. */
  readonly keepPlacing?: boolean;
  /** Ids of what gets placed. Defaults to `<catalog id>-<n>`. */
  readonly idFactory?: (item: CatalogItem, taken: ReadonlySet<string>) => string;
  /** Modes in which the tool is active. Defaults to `["play", "edit"]`: builders place in play. */
  readonly modes?: readonly string[];
}

export interface PlacedEvent {
  readonly catalogId: string;
  readonly id: string;
  readonly x: number;
  readonly y: number;
}

export interface RejectedEvent {
  readonly catalogId: string;
  /** Why: the reason of the step that refused, e.g. `"occupied"`. */
  readonly reason: string;
  readonly message: string;
}

export interface PlacementApi<Id extends string = string> {
  readonly catalog: Catalog<Id>;
  /** The item being placed, if any. */
  readonly active: Id | null;
  /** Starts placing: a ghost follows the pointer, valid or not, until a click or `cancel()`. */
  start(id: Id): void;
  cancel(): void;
  onPlaced(listener: (event: PlacedEvent) => void): Unsubscribe;
  onRejected(listener: (event: RejectedEvent) => void): Unsubscribe;
}

const offsetOf = (anchor: PlacementAnchor, width: number, height: number): Point =>
  anchor === "center" ? { x: -width / 2, y: -height / 2 } : anchor === "bottom-center" ? { x: -width / 2, y: -height } : { x: 0, y: 0 };

/**
 * Placing things of a catalog: the `element.place` intent, the ghost that
 * previews it through the same pipeline that validates it, and the tool that
 * drives both. Headless.
 */
export function createPlacement<C extends Catalog<string>>(
  controller: InteractionController<MaybePromise<ApplyResult>>,
  options: PlacementOptions<C>,
): { readonly api: PlacementApi<CatalogId<C>>; dispose(): void } {
  const { catalog } = options;
  const anchor = options.anchor ?? "center";
  const placedListeners = new Set<(event: PlacedEvent) => void>();
  const rejectedListeners = new Set<(event: RejectedEvent) => void>();
  const counters = new Map<string, number>();

  const itemOf = (id: string): CatalogItem | undefined => catalog.get(id);

  const probe = (item: CatalogItem, x: number, y: number) =>
    describeElement({ id: "__placement__", kind: item.sprite, x, y }, controller.describeContext);

  const definition: IntentDefinition<"element.place"> = {
    resolve(intent, { state }) {
      const item = itemOf(intent.catalogId);
      if (!item) return { ok: false, reason: "unknown-catalog-item", message: `"${intent.catalogId}" is not in the catalog` };
      const id = intent.id ?? nextId(item, new Set(state.elements.map((element) => element.id)));
      return {
        type: "element.add",
        element: { id, kind: item.sprite, x: intent.x, y: intent.y, ...(item.data ? { data: item.data } : {}) },
      };
    },
    footprint(intent): Footprint | undefined {
      const item = itemOf(intent.catalogId);
      const node = item ? probe(item, intent.x, intent.y) : undefined;
      return node ? { bounds: node.bounds, ...(node.hitbox ? { hitbox: node.hitbox } : {}) } : undefined;
    },
  };

  /** The next free id of an item. Nothing is consumed until `commit` is called, so a refused attempt wastes no number. */
  const candidate = (item: CatalogItem, taken: ReadonlySet<string>): { id: string; commit(): void } => {
    if (options.idFactory) return { id: options.idFactory(item, taken), commit: () => undefined };
    let n = counters.get(item.id) ?? 0;
    let id: string;
    do {
      n += 1;
      id = `${item.id}-${n}`;
    } while (taken.has(id));
    return { id, commit: () => void counters.set(item.id, n) };
  };

  const nextId = (item: CatalogItem, taken: ReadonlySet<string>): string => {
    const next = candidate(item, taken);
    next.commit();
    return next.id;
  };

  // The rules of the item come after those of the feature, on every placement.
  const itemRules: PipelineStep<"element.place"> = (intent, context, next) => {
    const rules = itemOf(intent.catalogId)?.pipeline;
    if (!rules || rules.length === 0) return next();
    const result = runPipeline(rules, intent, context);
    return result.ok ? next(result.intent) : result;
  };

  const stops: Unsubscribe[] = [
    controller.registerIntent("element.place", definition),
    controller.usePipeline("element.place", [...(options.pipeline ?? []), itemRules]),
  ];

  const ghostAt = (id: string, point: Point): void => {
    const item = itemOf(id);
    if (!item) return;
    const size = probe(item, 0, 0)?.bounds;
    const shift = size ? offsetOf(anchor, size.width, size.height) : { x: 0, y: 0 };
    const wanted = { type: "element.place" as const, catalogId: id, x: point.x + shift.x, y: point.y + shift.y };
    const result = controller.preview(wanted);
    const final = result.intent ?? wanted;
    const footprint = definition.footprint?.(final, {
      state: controller.model.state,
      assets: controller.assets,
      describe: controller.describeContext,
      actor: undefined,
    });
    controller.state.update({
      ghost: {
        catalogId: id,
        kind: item.sprite,
        x: final.x,
        y: final.y,
        valid: result.ok,
        ...(!result.ok ? { reason: result.reason } : {}),
        ...(footprint ? { bounds: footprint.bounds, ...(footprint.hitbox ? { hitbox: footprint.hitbox } : {}) } : {}),
      },
    });
  };

  const stopPlacing = (): void => controller.state.update({ placing: null, ghost: null });

  const tool: Tool = {
    id: "placement",
    modes: options.modes ?? ["play", "edit"],
    // Placing comes before selecting: while an item is in hand, a click places it.
    priority: 100,
    pointerDown(input: PointerInput) {
      const id = controller.state.get().placing;
      if (id === null) return false;
      if (input.button === 2) {
        stopPlacing();
        return true;
      }
      if (input.button !== 0) return false;

      const item = itemOf(id);
      if (!item) return true;
      ghostAt(id, input);
      const ghost = controller.state.get().ghost;
      if (!ghost) return true;

      const next = candidate(item, new Set(controller.model.state.elements.map((element) => element.id)));
      const placedId = next.id;
      const result = controller.submit({ type: "element.place", catalogId: id, id: placedId, x: ghost.x, y: ghost.y });
      const settle = (outcome: ApplyResult): void => {
        if (outcome.ok) {
          next.commit();
          for (const listener of [...placedListeners]) listener({ catalogId: id, id: placedId, x: ghost.x, y: ghost.y });
          if (!options.keepPlacing) stopPlacing();
        } else {
          const event = { catalogId: id, reason: outcome.rejection.code, message: outcome.rejection.message };
          for (const listener of [...rejectedListeners]) listener(event);
        }
      };
      if (typeof (result as Promise<unknown>).then === "function") void (result as Promise<ApplyResult>).then(settle);
      else settle(result as ApplyResult);
      return true;
    },
    pointerMove(input: PointerInput) {
      const id = controller.state.get().placing;
      if (id === null) return false;
      ghostAt(id, input);
      return false;
    },
    key(input: KeyInput) {
      if (input.key === "Escape" && controller.state.get().placing !== null) {
        stopPlacing();
        return true;
      }
      return false;
    },
    cancel: stopPlacing,
  };
  stops.push(controller.addTool(tool));

  const api: PlacementApi<CatalogId<C>> = {
    catalog: catalog as unknown as Catalog<CatalogId<C>>,
    get active() {
      return controller.state.get().placing as CatalogId<C> | null;
    },
    start(id) {
      if (!catalog.has(id)) throw new Error(`"${id}" is not in the catalog`);
      controller.state.update({ placing: id, ghost: null });
      if (controller.pointer) ghostAt(id, controller.pointer);
    },
    cancel: stopPlacing,
    onPlaced(listener) {
      placedListeners.add(listener);
      return () => placedListeners.delete(listener);
    },
    onRejected(listener) {
      rejectedListeners.add(listener);
      return () => rejectedListeners.delete(listener);
    },
  };

  return {
    api,
    dispose() {
      stops.forEach((stop) => stop());
      placedListeners.clear();
      rejectedListeners.clear();
    },
  };
}
