import type { MapElement } from "../model/definition";
import { describeElement } from "../renderer/scene";
import type { InteractionController } from "./controller";
import type { Footprint, IntentContext, IntentDefinition } from "./intents";
import type { Unsubscribe } from "../model/result";

const footprintAt = (element: MapElement | undefined, x: number, y: number, context: IntentContext): Footprint | undefined => {
  if (!element) return undefined;
  const node = describeElement({ ...element, x, y }, context.describe);
  if (!node) return undefined;
  return {
    bounds: node.bounds,
    ...(node.hitbox ? { hitbox: node.hitbox } : {}),
    // The element does not block itself at its new position.
    ignore: [{ type: "element", id: element.id }],
  };
};

const move: IntentDefinition<"element.move"> = {
  resolve(intent, { state }) {
    if (!state.elements.some((element) => element.id === intent.id)) {
      return { ok: false, reason: "not-found", message: `Element "${intent.id}" does not exist` };
    }
    return { type: "element.move", id: intent.id, x: intent.x, y: intent.y };
  },
  footprint: (intent, context) => footprintAt(context.state.elements.find((element) => element.id === intent.id), intent.x, intent.y, context),
};

const remove: IntentDefinition<"element.remove"> = {
  resolve(intent, { state }) {
    if (!state.elements.some((element) => element.id === intent.id)) {
      return { ok: false, reason: "not-found", message: `Element "${intent.id}" does not exist` };
    }
    return { type: "element.remove", id: intent.id };
  },
};

/**
 * Registers `element.move` and `element.remove`, the intents every editing tool of
 * elements relies on. Those already registered are left alone, so several features
 * can each make sure they are there.
 */
export function registerElementIntents(controller: InteractionController): Unsubscribe {
  const stops: Unsubscribe[] = [];
  if (!controller.hasIntent("element.move")) stops.push(controller.registerIntent("element.move", move));
  if (!controller.hasIntent("element.remove")) stops.push(controller.registerIntent("element.remove", remove));
  return () => stops.forEach((stop) => stop());
}
