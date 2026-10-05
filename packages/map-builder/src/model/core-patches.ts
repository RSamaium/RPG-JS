import type { MapDepth, MapElement, MapEvent, MapState } from "./definition";
import { cloneJson, isFiniteNumberValue, isJsonObject, isJsonValue, type JsonObject, type JsonValue } from "./json";
import { checkPlaced } from "./parse";
import { definePatchHandlers, patchFail, patchOk, type MapPatch, type PatchOutcome } from "./patches";

type Placed = MapElement | MapEvent;

function insertAt<T>(list: readonly T[], item: T, index: number | undefined): readonly T[] {
  const at = index === undefined || index > list.length ? list.length : index;
  return [...list.slice(0, at), item, ...list.slice(at)];
}

const replaceAt = <T>(list: readonly T[], index: number, item: T): readonly T[] =>
  list.map((entry, i) => (i === index ? item : entry));

const withoutAt = <T>(list: readonly T[], index: number): readonly T[] => list.filter((_, i) => i !== index);

const validIndex = (index: unknown, length: number): boolean =>
  index === undefined || (Number.isInteger(index) && (index as number) >= 0 && (index as number) <= length);

/** Canonical form: an empty `data` object is omitted. */
function withData<T extends Placed>(item: T, data: JsonObject): T {
  const { data: _previous, ...rest } = item;
  return (Object.keys(data).length === 0 ? rest : { ...rest, data }) as T;
}

type Collection = "elements" | "events";

function addPlaced(state: MapState, collection: Collection, value: unknown, index: unknown): PatchOutcome {
  const kind = collection === "elements" ? "element" : "event";
  const issues = checkPlaced(value, kind, kind);
  if (issues.length > 0) return patchFail("invalid-patch", issues.map((i) => `${i.path} ${i.message}`).join("; "));
  if (!isJsonValue(value)) return patchFail("invalid-patch", `${kind} must be JSON-serializable`);
  const item = value as unknown as Placed;
  const list = state[collection] as readonly Placed[];
  if (!validIndex(index, list.length)) return patchFail("invalid-patch", `index out of range`);
  if (list.some((entry) => entry.id === item.id)) {
    return patchFail("duplicate-id", `${kind} "${item.id}" already exists`);
  }
  const owned = cloneJson(item as unknown as JsonObject) as unknown as Placed;
  const copy = withData(owned, (owned.data ?? {}) as JsonObject);
  const removal = { type: `${kind}.remove`, id: item.id } as MapPatch;
  return patchOk({ ...state, [collection]: insertAt(list, copy, index as number | undefined) }, [removal]);
}

function removePlaced(state: MapState, collection: Collection, id: unknown): PatchOutcome {
  const kind = collection === "elements" ? "element" : "event";
  const list = state[collection] as readonly Placed[];
  const index = list.findIndex((entry) => entry.id === id);
  if (index < 0) return patchFail("not-found", `${kind} "${String(id)}" does not exist`);
  const restore = { type: `${kind}.add`, [kind]: list[index], index } as unknown as MapPatch;
  return patchOk({ ...state, [collection]: withoutAt(list, index) }, [restore]);
}

function movePlaced(state: MapState, collection: Collection, id: unknown, x: unknown, y: unknown): PatchOutcome {
  const kind = collection === "elements" ? "element" : "event";
  if (!isFiniteNumberValue(x) || !isFiniteNumberValue(y)) return patchFail("invalid-patch", "x and y must be finite numbers");
  const list = state[collection] as readonly Placed[];
  const index = list.findIndex((entry) => entry.id === id);
  if (index < 0) return patchFail("not-found", `${kind} "${String(id)}" does not exist`);
  const previous = list[index]!;
  const back = { type: `${kind}.move`, id: previous.id, x: previous.x, y: previous.y } as MapPatch;
  return patchOk({ ...state, [collection]: replaceAt(list, index, { ...previous, x, y }) }, [back]);
}

export const coreHandlers = definePatchHandlers({
  "element.add": { apply: (state, patch) => addPlaced(state, "elements", patch.element, patch.index) },
  "element.remove": { apply: (state, patch) => removePlaced(state, "elements", patch.id) },
  "element.move": { apply: (state, patch) => movePlaced(state, "elements", patch.id, patch.x, patch.y) },

  "element.update": {
    apply(state, patch) {
      const set = patch.set as { kind?: unknown; depth?: unknown } | undefined;
      if (typeof set !== "object" || set === null) return patchFail("invalid-patch", "set must be an object");
      if (set.kind !== undefined && (typeof set.kind !== "string" || set.kind.length === 0)) {
        return patchFail("invalid-patch", "kind must be a non-empty string");
      }
      if (set.depth !== undefined && set.depth !== null) {
        const issues = checkPlaced({ id: "_", kind: "_", x: 0, y: 0, depth: set.depth }, "element", "element");
        if (issues.length > 0) return patchFail("invalid-patch", issues.map((i) => `${i.path} ${i.message}`).join("; "));
      }
      const index = state.elements.findIndex((entry) => entry.id === patch.id);
      if (index < 0) return patchFail("not-found", `element "${patch.id}" does not exist`);
      const previous = state.elements[index]!;

      const next: Record<string, unknown> = { ...previous };
      const back: { kind?: string; depth?: MapDepth | null } = {};
      if (set.kind !== undefined) {
        next.kind = set.kind;
        back.kind = previous.kind;
      }
      if (set.depth !== undefined) {
        if (set.depth === null) delete next.depth;
        else next.depth = cloneJson(set.depth as JsonValue);
        back.depth = previous.depth ?? null;
      }
      return patchOk({ ...state, elements: replaceAt(state.elements, index, next as unknown as MapElement) }, [
        { type: "element.update", id: patch.id, set: back },
      ]);
    },
  },

  "element.data": {
    apply(state, patch) {
      const set = patch.set ?? {};
      const unset = patch.unset ?? [];
      if (!isJsonObject(set)) return patchFail("invalid-patch", "set must be a JSON object");
      if (!Array.isArray(unset) || !unset.every((key) => typeof key === "string")) {
        return patchFail("invalid-patch", "unset must be a list of keys");
      }
      const forbidden = [...Object.keys(set), ...unset].find((key) => key === "__proto__");
      if (forbidden) return patchFail("invalid-patch", `"${forbidden}" is not a valid data key`);
      const overlap = unset.find((key) => Object.hasOwn(set, key));
      if (overlap !== undefined) return patchFail("invalid-patch", `"${overlap}" is both set and unset`);
      const index = state.elements.findIndex((entry) => entry.id === patch.id);
      if (index < 0) return patchFail("not-found", `element "${patch.id}" does not exist`);
      const previous = state.elements[index]!;
      const before = previous.data ?? {};

      const after: Record<string, JsonValue> = { ...before };
      const restore: Record<string, JsonValue> = {};
      const remove: string[] = [];
      for (const [key, value] of Object.entries(set)) {
        if (Object.hasOwn(before, key)) restore[key] = before[key]!;
        else remove.push(key);
        after[key] = cloneJson(value);
      }
      for (const key of unset) {
        if (Object.hasOwn(before, key)) {
          restore[key] = before[key]!;
          delete after[key];
        }
      }
      const inverse: MapPatch = {
        type: "element.data",
        id: patch.id,
        ...(Object.keys(restore).length > 0 ? { set: restore } : {}),
        ...(remove.length > 0 ? { unset: remove } : {}),
      };
      return patchOk({ ...state, elements: replaceAt(state.elements, index, withData(previous, after)) }, [inverse]);
    },
  },

  "event.add": { apply: (state, patch) => addPlaced(state, "events", patch.event, patch.index) },
  "event.remove": { apply: (state, patch) => removePlaced(state, "events", patch.id) },
  "event.move": { apply: (state, patch) => movePlaced(state, "events", patch.id, patch.x, patch.y) },

  "extension.set": {
    apply(state, patch) {
      if (typeof patch.id !== "string" || patch.id.length === 0) return patchFail("invalid-patch", "id must be a non-empty string");
      if (patch.value !== undefined && !isJsonValue(patch.value)) return patchFail("invalid-patch", "value must be JSON");
      if (patch.id === "__proto__") return patchFail("invalid-patch", `"__proto__" is not a valid extension id`);
      const extensions: Record<string, JsonValue> = { ...(state.extensions ?? {}) };
      const had = Object.hasOwn(extensions, patch.id);
      const previous = extensions[patch.id];
      if (patch.value === undefined) delete extensions[patch.id];
      else extensions[patch.id] = cloneJson(patch.value);

      const { extensions: _drop, ...rest } = state;
      const next: MapState = Object.keys(extensions).length === 0 ? rest : { ...rest, extensions };
      const inverse: MapPatch = had
        ? { type: "extension.set", id: patch.id, value: previous as JsonValue }
        : { type: "extension.set", id: patch.id };
      return patchOk(next, [inverse]);
    },
  },
});
