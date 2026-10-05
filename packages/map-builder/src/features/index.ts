import { defineMapFeature, type MapFeature } from "../renderer/feature";
import { describeElement, describeEvent } from "../renderer/scene";

export { defineMapFeature, MapFeatureError, type FeatureRender, type MapFeature, type MapFeatureDefinition } from "../renderer/feature";

export const ELEMENTS_FEATURE_ID = "elements";
export const EVENTS_FEATURE_ID = "events";

/** Draws the elements of the map: trees, houses, anything placed. Read-only until the editing tools exist. */
export function elements(): MapFeature {
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
  });
}

/** Draws the events that have a graphic. Events without one are invisible in the map. */
export function events(): MapFeature {
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
