/** What the renderer needs to know about an asset, independently of how it is stored. */
export interface AssetDescriptor {
  /** Where the image lives. How it is fetched and decoded is up to the renderer. */
  readonly src: string;
  /**
   * `[x, y, width, height]` of the part of the image to show, for assets cut out
   * of a larger image (a tileset). Defaults to the whole image.
   */
  readonly frame?: readonly [x: number, y: number, width: number, height: number];
  /**
   * Size in pixels at which the asset is drawn. Defaults to the size of `frame`.
   * Without a `frame`, it is also taken as the size of the image. An asset that
   * declares neither is measured once its image has loaded.
   */
  readonly size?: readonly [width: number, height: number];
  /**
   * `[x, y, width, height]` of the collision box, in pixels of the *source* image
   * (`frame`), relative to its top-left corner. It is scaled with the asset.
   */
  readonly hitbox?: readonly [x: number, y: number, width: number, height: number];
}

/**
 * Turns an asset reference (`"tree-oak"`) into a descriptor. Studio, a local
 * folder or a game each provide their own.
 */
export interface AssetResolver<K extends string = string> {
  /** Every reference this resolver knows. */
  readonly kinds: readonly K[];
  has(kind: string): kind is K;
  resolve(kind: string): AssetDescriptor | undefined;
}

/** Union of the references a resolver knows. */
export type AssetKind<A> = A extends AssetResolver<infer K> ? K : never;

/** Declares assets once, so that references are checked by the compiler. */
export function defineAssets<const T extends Record<string, AssetDescriptor>>(
  assets: T,
): AssetResolver<Extract<keyof T, string>> {
  const table = new Map<string, AssetDescriptor>(Object.entries(assets));
  const kinds = [...table.keys()] as Extract<keyof T, string>[];
  return {
    kinds,
    has(kind): kind is Extract<keyof T, string> {
      return table.has(kind);
    },
    resolve(kind) {
      return table.get(kind);
    },
  };
}
