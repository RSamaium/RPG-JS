import type { MapState } from "../model/definition";
import type { MapPatch } from "../model/patches";
import { describeElement, type DescribeContext } from "../renderer/scene";

/** The one channel (a socket event) all the messages of the map builder travel on. */
export const MAP_BUILDER_CHANNEL = "map-builder";

/** A message with the map it is about: a player who changes map must never apply the old map's changes to the new one. */
export interface MapEnvelope {
  readonly map: string;
  readonly message: unknown;
}

export const wrap = (map: string, message: unknown): MapEnvelope => ({ map, message });

export function unwrap(raw: unknown): MapEnvelope | undefined {
  if (typeof raw !== "object" || raw === null) return undefined;
  const { map, message } = raw as Partial<MapEnvelope>;
  return typeof map === "string" && message !== undefined ? { map, message } : undefined;
}

export interface HitboxRect {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** What both `RpgMap` (server) and the client scene offer for static colliders. */
export interface StaticHitboxHost {
  replaceStreamedStaticHitboxes(namespace: string, hitboxes: HitboxRect[]): void;
  clearStreamedStaticHitboxes(namespace: string): void;
}

const NAMESPACE = "map-builder";

/** One namespace per element: changing a tree only rebuilds the collider of that tree. */
export const elementNamespace = (id: string): string => `${NAMESPACE}/${id}`;

/** The collider of an element: the hitbox the renderer and the pipelines already use, in world pixels. */
export function hitboxOf(state: MapState, id: string, context: DescribeContext): HitboxRect | undefined {
  const element = state.elements.find((entry) => entry.id === id);
  const hitbox = element ? describeElement(element, context)?.hitbox : undefined;
  return hitbox ? { id, x: hitbox.x, y: hitbox.y, width: hitbox.width, height: hitbox.height } : undefined;
}

/** Ids of the elements whose collider a patch may have changed, or `"all"`. */
export function changedElementIds(patches: readonly MapPatch[]): ReadonlySet<string> {
  const ids = new Set<string>();
  for (const patch of patches) {
    switch (patch.type) {
      case "element.add":
        ids.add(patch.element.id);
        break;
      case "element.remove":
      case "element.move":
      case "element.update":
      case "element.data": // hooks may derive size and hitbox from the data of an element
        ids.add(patch.id);
        break;
      default:
    }
  }
  return ids;
}

const applied = new WeakMap<object, Set<string>>();

/**
 * Keeps the static colliders of a map in step with its elements, one element at a time.
 * `"all"` rebuilds every collider, and removes those of elements that are gone: what
 * to do when the physics world was reset.
 */
export function syncElementHitboxes(
  host: StaticHitboxHost,
  state: MapState,
  ids: ReadonlySet<string> | "all",
  context: DescribeContext,
): void {
  const known = applied.get(host) ?? new Set<string>();
  applied.set(host, known);
  const targets = ids === "all" ? new Set([...known, ...state.elements.map((element) => element.id)]) : ids;
  for (const id of targets) {
    const rect = hitboxOf(state, id, context);
    if (rect) {
      host.replaceStreamedStaticHitboxes(elementNamespace(id), [rect]);
      known.add(id);
    } else if (known.delete(id)) {
      host.clearStreamedStaticHitboxes(elementNamespace(id));
    }
  }
}

/** Forgets what was applied: the physics world was wiped, so nothing is there any more. */
export const forgetHitboxes = (host: object): void => void applied.delete(host);

/** Removes every collider this module applied to a host, e.g. when the player leaves the map. */
export function clearHitboxes(host: StaticHitboxHost): void {
  for (const id of applied.get(host) ?? []) host.clearStreamedStaticHitboxes(elementNamespace(id));
  applied.delete(host);
}
