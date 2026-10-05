import type { Rect } from "../renderer/geometry";
import type { SceneNode } from "../renderer/scene";

/** An element or an event on the map. */
export interface TargetRef {
  readonly type: "element" | "event";
  readonly id: string;
}

export const targetKey = (target: TargetRef): string => `${target.type}s/${target.id}`;
export const sameTarget = (a: TargetRef, b: TargetRef): boolean => a.type === b.type && a.id === b.id;
export const targetOf = (node: SceneNode): TargetRef => ({ type: node.type, id: node.id });

export interface Point {
  readonly x: number;
  readonly y: number;
}

const contains = (rect: Rect, point: Point): boolean =>
  point.x >= rect.x && point.x <= rect.x + rect.width && point.y >= rect.y && point.y <= rect.y + rect.height;

export interface PickOptions {
  /**
   * What counts as being under the pointer: the drawn `"bounds"` (default), or
   * only the `"hitbox"`, for dense maps where sprites overlap a lot.
   */
  readonly area?: "bounds" | "hitbox";
  /** Only consider these kinds of target. */
  readonly types?: readonly TargetRef["type"][];
}

/**
 * Every node under `point`, front first. Front means drawn last: the highest
 * sort key, and among equals the one that appears later in the list.
 */
export function pickNodes(nodes: readonly SceneNode[], point: Point, options: PickOptions = {}): SceneNode[] {
  const area = options.area ?? "bounds";
  return nodes
    .map((node, order) => ({ node, order }))
    .filter(({ node }) => {
      if (options.types && !options.types.includes(node.type)) return false;
      const rect = area === "hitbox" ? node.hitbox : node.bounds;
      return rect !== undefined && contains(rect, point);
    })
    .sort((a, b) => b.node.sortKey - a.node.sortKey || b.order - a.order)
    .map(({ node }) => node);
}

/** The node drawn in front under `point`, if any. */
export const pickNode = (nodes: readonly SceneNode[], point: Point, options?: PickOptions): SceneNode | undefined =>
  pickNodes(nodes, point, options)[0];

/** Nodes whose bounds touch `area`, for a rubber-band selection. */
export function nodesIn(nodes: readonly SceneNode[], area: Rect, types?: readonly TargetRef["type"][]): SceneNode[] {
  const right = area.x + area.width;
  const bottom = area.y + area.height;
  return nodes.filter(
    (node) =>
      (!types || types.includes(node.type)) &&
      node.bounds.x <= right &&
      area.x <= node.bounds.x + node.bounds.width &&
      node.bounds.y <= bottom &&
      area.y <= node.bounds.y + node.bounds.height,
  );
}
