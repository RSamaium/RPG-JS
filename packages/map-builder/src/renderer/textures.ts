import { Assets, Rectangle, Texture } from "pixi.js";
import type { Frame } from "./geometry";

/** Loads the image behind an asset. Replaceable, so tests and games can bring their own loading. */
export interface TextureProvider {
  load(src: string): Texture | Promise<Texture>;
}

/** The default provider: PixiJS `Assets`. */
export const pixiTextureProvider: TextureProvider = { load: (src) => Assets.load<Texture>(src) };

export interface TextureStore {
  /** The texture, or `undefined` while the image is loading (or if it failed). */
  get(src: string, frame?: Frame): Texture | undefined;
  /** Loads the image, then resolves the texture. Rejects if loading failed. */
  ready(src: string, frame?: Frame): Promise<Texture>;
  /** Size of a loaded image, before any frame is applied. */
  size(src: string): readonly [number, number] | undefined;
  destroy(): void;
}

const frameKey = (src: string, frame?: Frame): string => (frame ? `${src}#${frame.join(",")}` : src);

/** Loads each image once and caches the textures cut out of it. */
export function createTextureStore(provider: TextureProvider): TextureStore {
  const loading = new Map<string, Promise<Texture>>();
  const loaded = new Map<string, Texture>();
  const frames = new Map<string, Texture>();

  const base = (src: string): Promise<Texture> => {
    let promise = loading.get(src);
    if (!promise) {
      promise = Promise.resolve(provider.load(src)).then((texture) => {
        loaded.set(src, texture);
        return texture;
      });
      loading.set(src, promise);
      // A failed load can be retried on the next request.
      promise.catch(() => loading.delete(src));
    }
    return promise;
  };

  const cut = (src: string, texture: Texture, frame?: Frame): Texture => {
    if (!frame) return texture;
    const key = frameKey(src, frame);
    let part = frames.get(key);
    if (!part) {
      part = new Texture({ source: texture.source, frame: new Rectangle(frame[0], frame[1], frame[2], frame[3]) });
      frames.set(key, part);
    }
    return part;
  };

  return {
    get(src, frame) {
      const texture = loaded.get(src);
      if (!texture) {
        void base(src).catch(() => undefined);
        return undefined;
      }
      return cut(src, texture, frame);
    },
    ready: async (src, frame) => cut(src, await base(src), frame),
    size(src) {
      const texture = loaded.get(src);
      return texture ? [texture.width, texture.height] : undefined;
    },
    destroy() {
      for (const part of frames.values()) part.destroy(false);
      frames.clear();
      loaded.clear();
      loading.clear();
    },
  };
}
