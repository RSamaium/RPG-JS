import type { Rect } from "../renderer/geometry";
import type { InteractionController, Tool } from "./controller";
import type { KeyInput, PointerInput } from "./input";
import type { MapIntent } from "./intents";
import { nodesIn, sameTarget, targetOf, type PickOptions, type Point, type TargetRef } from "./picking";

export interface SelectionToolOptions {
  readonly modes?: readonly string[];
  /** What can be selected. Defaults to elements and events. */
  readonly types?: readonly TargetRef["type"][];
  readonly area?: PickOptions["area"];
  /**
   * Dragging selected elements. `false` turns it off. With `live`, the model
   * follows the pointer (one undo step); without, it changes on release.
   */
  readonly drag?: false | { readonly live?: boolean; readonly threshold?: number };
  /** Select with a rubber band on empty space. Defaults to true. */
  readonly marquee?: boolean;
  /** `Delete` and `Backspace` remove the selected elements. Defaults to false. */
  readonly remove?: boolean;
  readonly when?: (input: PointerInput | KeyInput) => boolean;
  readonly priority?: number;
}

interface Pending {
  readonly origin: Point;
  readonly targets: readonly TargetRef[];
  readonly starts: ReadonlyMap<string, Point>;
  /** Clicking a member of a multiple selection, without a drag, narrows the selection to it. */
  readonly collapseTo?: TargetRef;
  started: boolean;
  applied: boolean;
}

const rectOf = (a: Point, b: Point): Rect => ({
  x: Math.min(a.x, b.x),
  y: Math.min(a.y, b.y),
  width: Math.abs(a.x - b.x),
  height: Math.abs(a.y - b.y),
});

const withTarget = (selection: readonly TargetRef[], target: TargetRef): TargetRef[] =>
  selection.some((other) => sameTarget(other, target)) ? [...selection] : [...selection, target];

/**
 * Hover, click and rubber-band selection, dragging and deleting. Headless: it
 * only reads and writes the interaction state and submits intents.
 */
export function selectionTool(options: SelectionToolOptions = {}): Tool {
  const types = options.types ?? (["element", "event"] as const);
  const pickOptions: PickOptions = { area: options.area ?? "bounds", types };
  const dragOptions = options.drag === false ? null : (options.drag ?? {});
  const threshold = dragOptions?.threshold ?? 3;
  const live = dragOptions?.live ?? false;
  const marquee = options.marquee ?? true;

  let pending: Pending | null = null;
  let band: { origin: Point; base: readonly TargetRef[] } | null = null;
  let dragCount = 0;
  let dragKey = "";

  const moves = (drag: Pending, dx: number, dy: number): MapIntent[] =>
    drag.targets.flatMap((target): MapIntent[] => {
      const start = drag.starts.get(`${target.type}:${target.id}`);
      return target.type === "element" && start ? [{ type: "element.move", id: target.id, x: start.x + dx, y: start.y + dy }] : [];
    });

  const endDrag = (controller: InteractionController): void => {
    pending = null;
    controller.state.update({ drag: null });
  };

  const abort = (controller: InteractionController): void => {
    if (pending?.started && pending.applied) controller.model.history?.undo();
    if (pending) endDrag(controller);
    if (band) {
      band = null;
      controller.state.update({ marquee: null });
    }
  };

  return {
    id: "selection",
    modes: options.modes ?? ["edit"],
    ...(options.priority !== undefined ? { priority: options.priority } : {}),
    ...(options.when ? { when: options.when } : {}),

    pointerDown(input: PointerInput, controller) {
      if (input.button !== 0) return false;
      const node = controller.pick(input, pickOptions);
      const selection = controller.state.get().selection;

      if (!node) {
        if (!input.modifiers.shift) controller.state.update({ selection: [] });
        if (!marquee) return false;
        band = { origin: input, base: input.modifiers.shift ? selection : [] };
        return true;
      }

      const target = targetOf(node);
      const selected = selection.some((other) => sameTarget(other, target));
      if (input.modifiers.shift) {
        controller.state.update({ selection: selected ? selection.filter((other) => !sameTarget(other, target)) : [...selection, target] });
        return true;
      }

      const next = selected ? selection : [target];
      controller.state.update({ selection: next });
      if (dragOptions) {
        const state = controller.model.state;
        const starts = new Map<string, Point>();
        for (const item of next) {
          const element = item.type === "element" ? state.elements.find((entry) => entry.id === item.id) : undefined;
          if (element) starts.set(`${item.type}:${item.id}`, { x: element.x, y: element.y });
        }
        pending = {
          origin: input,
          targets: next,
          starts,
          ...(selected && next.length > 1 ? { collapseTo: target } : {}),
          started: false,
          applied: false,
        };
      }
      return true;
    },

    pointerMove(input: PointerInput, controller) {
      if (band) {
        const rect = rectOf(band.origin, input);
        const inside = nodesIn(controller.nodes(), rect, types).map(targetOf);
        const selection = inside.reduce<TargetRef[]>((all, target) => withTarget(all, target), [...band.base]);
        controller.state.update({ marquee: rect, selection });
        return true;
      }

      if (pending) {
        const dx = input.x - pending.origin.x;
        const dy = input.y - pending.origin.y;
        if (!pending.started && Math.hypot(dx, dy) < threshold) return true;
        if (!pending.started) {
          pending.started = true;
          dragCount += 1;
          dragKey = `drag:${dragCount}`;
        }

        const intents = moves(pending, dx, dy);
        if (intents.length === 0) return true;
        const refused = intents
          .map((intent) => controller.preview(intent as never, { ignore: pending!.targets }))
          .find((result) => !result.ok);
        const reason = refused && !refused.ok ? refused.reason : undefined;
        controller.state.update({
          drag: {
            targets: pending.targets,
            origin: pending.origin,
            delta: { x: dx, y: dy },
            valid: !refused,
            ...(reason !== undefined ? { reason } : {}),
            live,
          },
        });
        if (live && !refused) {
          const result = controller.submit(intents, { coalesce: dragKey });
          if (!("then" in (result as object)) && (result as { ok: boolean }).ok) pending.applied = true;
        }
        return true;
      }

      const node = controller.pick(input, pickOptions);
      controller.state.update({ hovered: node ? targetOf(node) : null });
      return false;
    },

    pointerUp(input: PointerInput, controller) {
      if (band) {
        band = null;
        controller.state.update({ marquee: null });
        return;
      }
      if (!pending) return;
      const drag = pending;
      if (!drag.started) {
        if (drag.collapseTo) controller.state.update({ selection: [drag.collapseTo] });
        pending = null;
        return;
      }
      if (!live) {
        const state = controller.state.get().drag;
        if (state?.valid) controller.submit(moves(drag, state.delta.x, state.delta.y));
      }
      endDrag(controller);
    },

    key(input: KeyInput, controller) {
      if (input.key === "Escape") {
        if (pending?.started || band) {
          abort(controller);
          return true;
        }
        if (controller.state.get().selection.length > 0) {
          controller.state.update({ selection: [] });
          return true;
        }
        return false;
      }
      if (options.remove && (input.key === "Delete" || input.key === "Backspace")) {
        const ids = controller.state.get().selection.filter((target) => target.type === "element");
        if (ids.length === 0) return false;
        controller.submit(ids.map((target): MapIntent => ({ type: "element.remove", id: target.id })));
        return true;
      }
      return false;
    },

    cancel(controller) {
      abort(controller);
    },
  };
}
