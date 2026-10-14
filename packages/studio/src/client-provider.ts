"use client";

import { provideClientMapStreaming } from "@rpgjs/client";
import MapComponentV2 from "./components/draw-map-v2.ce";
import loadMap from "./map-loader";
import { resolveAssetSource } from "./spritesheet-utils";
import {
  applyStudioMapStreamChunk,
  createStudioMapStreamState,
  getStudioMapStreamData,
  removeStudioMapStreamChunk,
  type StudioMapStreamChunkData,
  type StudioMapStreamManifestData,
  type StudioMapStreamState,
} from "./map-streaming";

export function resolveStreamedAudioSource(value: unknown): string {
  if (!value) return "";
  if (typeof value === "string") {
    const source = value.trim();
    if (source.startsWith("{")) {
      try {
        return resolveStreamedAudioSource(JSON.parse(source));
      } catch {
        // not JSON, treat as a plain file name
      }
    }
    return resolveAssetSource(source);
  }
  if (typeof value === "object") {
    const media = value as Record<string, unknown>;
    const source = media.fileName ?? media.src ?? media.url;
    return typeof source === "string" ? resolveAssetSource(source) : "";
  }
  return "";
}

export function createStudioMapClientProviders(): any[] {
  return provideClientMapStreaming<
    StudioMapStreamManifestData,
    StudioMapStreamChunkData,
    StudioMapStreamState
  >({
    adapter: {
      component: MapComponentV2,
      createState: createStudioMapStreamState,
      applyChunk: applyStudioMapStreamChunk,
      removeChunk: removeStudioMapStreamChunk,
      getData: getStudioMapStreamData,
      getParams: (manifest) => ({
        backgroundMusic: resolveStreamedAudioSource(
          manifest.renderData.map.params?.backgroundMusic
        ),
        backgroundAmbientSound: resolveStreamedAudioSource(
          manifest.renderData.map.params?.backgroundAmbientSound
        ),
      }),
    },
    directLoad: loadMap,
  });
}
