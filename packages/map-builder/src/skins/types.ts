import type { Container } from "pixi.js";
import type { AssetResolver } from "../model/assets";
import type { InteractionSnapshot } from "../interaction/controller";
import type { SceneNode } from "../renderer/scene";
import type { TextureStore } from "../renderer/textures";

/** What a skin layer can reach to draw itself. */
export interface SkinContext {
  /** Draw into this container: it sits in the overlay stage, above the map. */
  readonly layer: Container;
  readonly textures: TextureStore;
  readonly assets: AssetResolver;
  /** What is drawn on the map right now: where things are, how big they are. */
  nodes(): readonly SceneNode[];
  /** Call when something async finished (an image loaded) and the layer should draw again. */
  requestUpdate(): void;
}

/** One visual of the interaction layer. It reads the published state and draws it; it never changes anything. */
export interface SkinLayer {
  /** Called whenever the interaction state or the map changes. */
  update(snapshot: InteractionSnapshot): void;
  /** Called every frame with the time elapsed, for animations. */
  tick?(deltaMs: number): void;
  destroy(): void;
}

export type SkinLayerFactory = (context: SkinContext) => SkinLayer;

/**
 * How the interaction layer looks. Every part is optional and replaceable on its
 * own, so a game can restyle the ghost and keep the default selection.
 */
export interface Skin {
  /** Frames around what is selected. */
  readonly selection?: SkinLayerFactory;
  /** What is under the pointer. */
  readonly hover?: SkinLayerFactory;
  /** Where the dragged things would land, valid or not. */
  readonly drag?: SkinLayerFactory;
  /** The rubber band of a selection in progress. */
  readonly marquee?: SkinLayerFactory;
  /** The item being placed, following the pointer. */
  readonly ghost?: SkinLayerFactory;
}

/** Checks a skin at compile time. */
export const defineSkin = (skin: Skin): Skin => skin;

/** A skin is a set of parts: `override` replaces the parts it defines and keeps the others of `base`. */
export const mergeSkin = (base: Skin, override: Skin | undefined): Skin => ({ ...base, ...override });
