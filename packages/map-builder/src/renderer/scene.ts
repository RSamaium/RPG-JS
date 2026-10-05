import type { AssetDescriptor, AssetResolver } from "../model/assets";
import type { MapElement, MapEvent } from "../model/definition";
import { resolveElementGeometry, unionBounds, type Frame, type Rect } from "./geometry";

export type StageName = "ground" | "objects" | "overlay" | "lighting" | "post";

/** Draw order, back to front. Only `objects` is filled by the built-in features. */
export const STAGE_ORDER: readonly StageName[] = ["ground", "objects", "overlay", "lighting", "post"];

/** One image drawn at a world position. */
export interface ScenePart {
  readonly key: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly src: string;
  readonly frame?: Frame;
}

/** What to draw for one element or event. Plain data: it can be compared, logged and snapshotted. */
export interface SceneNode {
  /** Unique in the scene: `<feature>/<id>`. */
  readonly key: string;
  readonly id: string;
  readonly type: "element" | "event";
  readonly kind: string;
  readonly stage: StageName;
  /** Nodes with a higher key are drawn in front. */
  readonly sortKey: number;
  readonly bounds: Rect;
  readonly parts: readonly ScenePart[];
  /** Collision box in world coordinates. */
  readonly hitbox?: Rect;
}

/** A part given by a hook, relative to the element origin. */
export interface SpritePartSpec {
  readonly key?: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly src?: string;
  readonly frame?: Frame;
}

/** What a hook can change about how an element is drawn. */
export interface ElementSpriteSpec {
  /** Replaces the single image by these parts (a repeated body, a nine-slice…). */
  readonly parts?: readonly SpritePartSpec[];
  readonly src?: string;
  readonly frame?: Frame;
  readonly size?: readonly [number, number];
  readonly hitbox?: Frame;
}

export interface MapViewHooks {
  /** Changes how an element is drawn. Studio uses it for drawing rules and element sizes. */
  resolveElementSprite?(element: MapElement, context: { readonly descriptor: AssetDescriptor | undefined }): ElementSpriteSpec | undefined;
  /** Last chance to adjust a node, e.g. its sort key or its parts. */
  onBeforeRenderElement?(node: SceneNode, element: MapElement): SceneNode | void;
  /** An element or an event refers to an asset nobody knows. */
  onMissingAsset?(kind: string, owner: { readonly type: "element" | "event"; readonly id: string }): void;
}

export interface DescribeContext {
  readonly assets: AssetResolver;
  readonly hooks?: MapViewHooks;
  /** Size of a loaded image, for assets that do not declare one. */
  readonly measure?: (src: string) => readonly [number, number] | undefined;
}

const toParts = (nodeKey: string, spec: readonly SpritePartSpec[], origin: { x: number; y: number }, src: string): ScenePart[] =>
  spec.map((part, index) => ({
    key: part.key ?? `${nodeKey}#${index}`,
    x: origin.x + part.x,
    y: origin.y + part.y,
    width: part.width,
    height: part.height,
    src: part.src ?? src,
    ...(part.frame ? { frame: part.frame } : {}),
  }));

/**
 * What to draw for an element, or `undefined` when nothing can be drawn yet: the
 * asset is unknown, or its size is not known until its image has loaded.
 */
export function describeElement(element: MapElement, context: DescribeContext): SceneNode | undefined {
  const descriptor = context.assets.resolve(element.kind);
  const spec = context.hooks?.resolveElementSprite?.(element, { descriptor });
  if (!descriptor && !spec) {
    context.hooks?.onMissingAsset?.(element.kind, { type: "element", id: element.id });
    return undefined;
  }

  const src = spec?.src ?? descriptor?.src;
  if (!src) return undefined;
  const frame = spec?.frame ?? descriptor?.frame;
  const size = spec?.size ?? descriptor?.size;
  const hitbox = spec?.hitbox ?? descriptor?.hitbox;

  const geometry = resolveElementGeometry({
    x: element.x,
    y: element.y,
    ...(element.scale !== undefined ? { scale: element.scale } : {}),
    ...(element.depth ? { depth: element.depth } : {}),
    ...(frame ? { frame } : {}),
    ...(size ? { size } : {}),
    ...(hitbox ? { hitbox } : {}),
    ...(() => {
      // Only an image that declares neither a frame nor a size has to be measured.
      const measured = frame || size ? undefined : context.measure?.(src);
      return measured ? { sourceSize: measured } : {};
    })(),
  });
  if (!geometry) return undefined;

  const key = `elements/${element.id}`;
  const parts: ScenePart[] = spec?.parts
    ? toParts(key, spec.parts, element, src)
    : [
        {
          key: "default",
          x: geometry.draw.x,
          y: geometry.draw.y,
          width: geometry.draw.width,
          height: geometry.draw.height,
          src,
          ...(frame ? { frame } : {}),
        },
      ];

  const node: SceneNode = {
    key,
    id: element.id,
    type: "element",
    kind: element.kind,
    stage: "objects",
    sortKey: geometry.sortKey,
    bounds: unionBounds(parts),
    parts,
    ...(geometry.hitbox
      ? {
          hitbox: {
            x: geometry.draw.x + geometry.hitbox.x * geometry.hitbox.scaleX,
            y: geometry.draw.y + geometry.hitbox.y * geometry.hitbox.scaleY,
            width: geometry.hitbox.width * geometry.hitbox.scaleX,
            height: geometry.hitbox.height * geometry.hitbox.scaleY,
          },
        }
      : {}),
  };
  return context.hooks?.onBeforeRenderElement?.(node, element) ?? node;
}

/** What to draw for an event: its graphic, when it has one that is a known asset. */
export function describeEvent(event: MapEvent, context: DescribeContext): SceneNode | undefined {
  if (event.graphic === undefined) return undefined;
  const descriptor = context.assets.resolve(event.graphic);
  if (!descriptor) {
    context.hooks?.onMissingAsset?.(event.graphic, { type: "event", id: event.id });
    return undefined;
  }
  const measured = descriptor.frame || descriptor.size ? undefined : context.measure?.(descriptor.src);
  const geometry = resolveElementGeometry({
    x: event.x,
    y: event.y,
    ...(descriptor.frame ? { frame: descriptor.frame } : {}),
    ...(descriptor.size ? { size: descriptor.size } : {}),
    ...(descriptor.hitbox ? { hitbox: descriptor.hitbox } : {}),
    ...(measured ? { sourceSize: measured } : {}),
  });
  if (!geometry) return undefined;

  const part: ScenePart = {
    key: "default",
    x: geometry.draw.x,
    y: geometry.draw.y,
    width: geometry.draw.width,
    height: geometry.draw.height,
    src: descriptor.src,
    ...(descriptor.frame ? { frame: descriptor.frame } : {}),
  };
  return {
    key: `events/${event.id}`,
    id: event.id,
    type: "event",
    kind: event.kind,
    stage: "objects",
    sortKey: geometry.sortKey,
    bounds: unionBounds([part]),
    parts: [part],
  };
}
