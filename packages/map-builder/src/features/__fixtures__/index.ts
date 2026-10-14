import { Container, Graphics, Texture, TextureSource } from "pixi.js";
import { createMapModel } from "../../model/model";
import { defineCatalog } from "../../interaction/catalog";
import type { TextureProvider } from "../../renderer/textures";
import { createMapView } from "../../renderer/view";
import type { MapFeature } from "../../renderer/feature";
import { assets, world } from "../../interaction/__fixtures__";
import type { ApplyResult } from "../../model/result";
import { elements, events, history, placement, selection } from "../index";

export { assets, world };

export const catalog = defineCatalog([
  { id: "oak", sprite: "tree" },
  { id: "cabin", sprite: "house" },
]);

export function fakeTextures() {
  const loads: string[] = [];
  const provider: TextureProvider = {
    load(src) {
      loads.push(src);
      return new Texture({ source: new TextureSource({ width: 64, height: 64 }) });
    },
  };
  return { provider, loads };
}

/** Emits a PixiJS pointer event on the root of a view, the way the renderer would. */
export function pointerEvents(root: Container) {
  const fire = (type: string, x: number, y: number, extra: Record<string, unknown> = {}) =>
    root.emit(type, { getLocalPosition: () => ({ x, y }), button: 0, ...extra } as never);
  return {
    down: (x: number, y: number, extra?: Record<string, unknown>) => fire("pointerdown", x, y, extra),
    move: (x: number, y: number, extra?: Record<string, unknown>) => fire("globalpointermove", x, y, extra),
    up: (x: number, y: number, extra?: Record<string, unknown>) => fire("pointerup", x, y, extra),
    upOutside: (x: number, y: number) => fire("pointerupoutside", x, y),
  };
}

/** What a Graphics draws: its fills and strokes, with colour, alpha, width and rectangle. */
export function shapesOf(container: Container) {
  return container.children
    .filter((child): child is Graphics => child instanceof Graphics)
    .flatMap((graphics) =>
      graphics.context.instructions.map((instruction) => {
        const data = instruction.data as unknown as { style?: { color: number; alpha: number; width?: number }; path?: { shapePath: { shapePrimitives: Array<{ shape: { x: number; y: number; width: number; height: number } }> } } };
        const rect = data.path?.shapePath.shapePrimitives[0]?.shape;
        return { action: instruction.action as "fill" | "stroke", color: data.style?.color, alpha: data.style?.alpha, width: data.style?.width, rect: rect && { x: rect.x, y: rect.y, width: rect.width, height: rect.height } };
      }),
    );
}

export const overlayLayers = (view: { stages: { overlay: Container } }): Container[] => view.stages.overlay.children as Container[];

const defaultFeatures = () => [elements({ edit: true }), events(), selection({ remove: true }), placement({ catalog }), history<ApplyResult>()] as const;
type DefaultFeatures = ReturnType<typeof defaultFeatures>;

/** An editor with every feature. */
export const defaultEditor = (options: Record<string, unknown> = {}) => editor(defaultFeatures(), options);

export function editor<const F extends readonly MapFeature<string, object>[] = DefaultFeatures>(
  features?: F,
  options: Record<string, unknown> = {},
) {
  const model = createMapModel(world());
  const textures = fakeTextures();
  const view = createMapView({
    model,
    assets,
    features: (features ?? defaultFeatures()) as unknown as F,
    textures: textures.provider,
    onError: () => undefined,
    ...options,
  });
  return { model, view, textures, pointer: pointerEvents(view.root) };
}
