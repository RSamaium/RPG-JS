"use client";

import { provideClientMapStreaming } from "@rpgjs/client";
import MapComponentV2 from "./components/draw-map-v2.ce";
import loadMap from "./map-loader";
import {
  applyStudioMapStreamChunk,
  createStudioMapStreamState,
  getStudioMapStreamData,
  removeStudioMapStreamChunk,
  type StudioMapStreamChunkData,
  type StudioMapStreamManifestData,
  type StudioMapStreamState,
} from "./map-streaming";

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
        backgroundMusic: manifest.renderData.map.params?.backgroundMusic,
        backgroundAmbientSound:
          manifest.renderData.map.params?.backgroundAmbientSound,
        combatMusic: manifest.renderData.map.params?.combatMusic,
      }),
    },
    directLoad: loadMap,
  });
}
