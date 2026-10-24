import type { Unsubscribe } from "../model/result";
import { registerElementIntents } from "../interaction/builtin-intents";
import type { Catalog, CatalogId } from "../interaction/catalog";
import type { InteractionController } from "../interaction/controller";
import type { TargetRef } from "../interaction/picking";
import { sameTarget } from "../interaction/picking";
import { createPlacement, type PlacementApi, type PlacementOptions } from "../interaction/placement";
import type { PipelineStep } from "../interaction/pipeline";
import { selectionTool, type SelectionToolOptions } from "../interaction/selection-tool";
import { defineMapFeature, type MapFeature } from "../renderer/feature";
import { describeElement, describeEvent } from "../renderer/scene";
import { defaultSkin } from "../skins/default";
import { mergeSkin, type Skin } from "../skins/types";
import type { MapHistory } from "../model/history";
import type { ApplyResult, MaybePromise } from "../model/result";
import { mountSkinLayers } from "./skin";

export {
  defineMapFeature,
  MapFeatureError,
  type FeatureApis,
  type FeatureHost,
  type FeatureInstance,
  type FeatureRender,
  type MapFeature,
  type MapFeatureDefinition,
} from "../renderer/feature";
export { mountSkinLayers } from "./skin";

export const ELEMENTS_FEATURE_ID = "elements";
export const EVENTS_FEATURE_ID = "events";
export const SELECTION_FEATURE_ID = "selection";
export const PLACEMENT_FEATURE_ID = "placement";
export const HISTORY_FEATURE_ID = "history";

export interface ElementsOptions {
  /**
   * Make elements editable through `view.submit`: registers the `element.move` and
   * `element.remove` intents. Editing tools (`selection()`) do it on their own.
   */
  readonly edit?: boolean;
  /** Rules every move and every removal goes through, whoever asks: a tool, `view.submit`, a game. */
  readonly pipeline?: {
    readonly move?: readonly PipelineStep<"element.move">[];
    readonly remove?: readonly PipelineStep<"element.remove">[];
  };
}

/** Draws the elements of the map: trees, houses, anything placed. */
export function elements(options: ElementsOptions = {}): MapFeature<"elements"> {
  const editable = options.edit === true || options.pipeline !== undefined;
  return defineMapFeature({
    id: ELEMENTS_FEATURE_ID,
    render: {
      stage: "objects",
      describeAll: (state, context) => state.elements.flatMap((element) => describeElement(element, context) ?? []),
      describeOne(state, id, context) {
        const element = state.elements.find((entry) => entry.id === id);
        return element ? describeElement(element, context) : undefined;
      },
      affected(patch) {
        switch (patch.type) {
          case "element.add":
            return [patch.element.id];
          case "element.remove":
          case "element.move":
          case "element.update":
          case "element.data":
            return [patch.id];
          default:
            return "none";
        }
      },
    },
    ...(editable
      ? {
          setup(host) {
            const stops: Unsubscribe[] = [registerElementIntents(host.interaction as unknown as InteractionController)];
            if (options.pipeline?.move) stops.push(host.interaction.usePipeline("element.move", options.pipeline.move));
            if (options.pipeline?.remove) stops.push(host.interaction.usePipeline("element.remove", options.pipeline.remove));
            return { dispose: () => stops.forEach((stop) => stop()) };
          },
        }
      : {}),
  });
}

/** Draws the events that have a graphic. Events without one are invisible in the map. */
export function events(): MapFeature<"events"> {
  return defineMapFeature({
    id: EVENTS_FEATURE_ID,
    render: {
      stage: "objects",
      describeAll: (state, context) => state.events.flatMap((event) => describeEvent(event, context) ?? []),
      describeOne(state, id, context) {
        const event = state.events.find((entry) => entry.id === id);
        return event ? describeEvent(event, context) : undefined;
      },
      affected(patch) {
        switch (patch.type) {
          case "event.add":
            return [patch.event.id];
          case "event.remove":
          case "event.move":
            return [patch.id];
          default:
            return "none";
        }
      },
    },
  });
}

export interface SelectionApi {
  /** What is selected, in the order it was selected. */
  readonly current: readonly TargetRef[];
  /** What is under the pointer. */
  readonly hovered: TargetRef | null;
  select(targets: TargetRef | readonly TargetRef[], options?: { readonly additive?: boolean }): void;
  clear(): void;
  has(target: TargetRef): boolean;
  /** Called when the selection or the hover changes. Plugs into Angular signals, Vue, React… */
  subscribe(listener: (selection: readonly TargetRef[]) => void): Unsubscribe;
}

export interface SelectionFeatureOptions extends SelectionToolOptions {
  /** Replaces parts of the default skin: `{ selection: myGlow }`. */
  readonly skin?: Skin;
}

/** Hover, selection, rubber band, dragging and deleting. Needs the elements feature. */
export function selection(options: SelectionFeatureOptions = {}): MapFeature<"selection", SelectionApi> {
  const { skin, ...toolOptions } = options;
  return defineMapFeature({
    id: SELECTION_FEATURE_ID,
    requires: [ELEMENTS_FEATURE_ID],
    setup(host) {
      const controller = host.interaction;
      const stops: Unsubscribe[] = [
        registerElementIntents(controller as unknown as InteractionController),
        controller.addTool(selectionTool(toolOptions)),
        mountSkinLayers(
          host,
          (() => {
            const look = mergeSkin(defaultSkin(), skin);
            return [look.selection, look.hover, look.drag, look.marquee];
          })(),
        ),
      ];
      const api: SelectionApi = {
        get current() {
          return controller.state.get().selection;
        },
        get hovered() {
          return controller.state.get().hovered;
        },
        select(targets, selectOptions) {
          const list = Array.isArray(targets) ? (targets as readonly TargetRef[]) : [targets as TargetRef];
          const base = selectOptions?.additive ? controller.state.get().selection : [];
          const next = [...base];
          for (const target of list) if (!next.some((other) => sameTarget(other, target))) next.push(target);
          controller.state.update({ selection: next });
        },
        clear: () => controller.state.update({ selection: [] }),
        has: (target) => controller.state.get().selection.some((other) => sameTarget(other, target)),
        subscribe(listener) {
          let last = controller.state.get();
          return controller.state.subscribe((state) => {
            if (state.selection !== last.selection || state.hovered !== last.hovered) listener(state.selection);
            last = state;
          });
        },
      };
      return { api, dispose: () => stops.forEach((stop) => stop()) };
    },
  });
}

export interface PlacementFeatureOptions<C extends Catalog<string>> extends PlacementOptions<C> {
  /** Replaces parts of the default skin: `{ ghost: myGhost }`. */
  readonly skin?: Skin;
}

/** Placing things of a catalog, with a ghost that previews the rules. Needs the elements feature. */
export function placement<const C extends Catalog<string>>(
  options: PlacementFeatureOptions<C>,
): MapFeature<"placement", PlacementApi<CatalogId<C>>> {
  const { skin, ...placementOptions } = options;
  return defineMapFeature({
    id: PLACEMENT_FEATURE_ID,
    requires: [ELEMENTS_FEATURE_ID],
    setup(host) {
      const placed = createPlacement(host.interaction as never, placementOptions);
      const unmount = mountSkinLayers(host, [mergeSkin(defaultSkin(), skin).ghost]);
      return {
        api: placed.api,
        dispose() {
          unmount();
          placed.dispose();
        },
      };
    },
  });
}

/**
 * Undo and redo of the model, on the view: `view.history.undo()`.
 *
 * The feature cannot know whether the model answers at once or later, so results are
 * typed `MaybePromise<ApplyResult>`. With a local committer, say so: `history<ApplyResult>()`.
 */
export function history<R extends MaybePromise<ApplyResult> = MaybePromise<ApplyResult>>(): MapFeature<"history", MapHistory<R>> {
  return defineMapFeature({
    id: HISTORY_FEATURE_ID,
    setup(host) {
      const model = host.model;
      if (!model.history) throw new Error("The history feature needs a model that has a history");
      return { api: model.history as unknown as MapHistory<R> };
    },
  });
}

export {
  terrain,
  canvasSurface,
  decodeRaster,
  memorySurface,
  TERRAIN_FEATURE_ID,
  type TerrainApi,
  type TerrainOptions,
  type TerrainSurface,
  type TerrainSurfaceFactory,
} from "./terrain";
