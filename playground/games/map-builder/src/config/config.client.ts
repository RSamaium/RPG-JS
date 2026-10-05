import { Presets, provideClientGlobalConfig, provideClientModules, provideLoadMap } from "@rpgjs/client";
import { provideMapBuilder as provideMapBuilderClient } from "@rpgjs/map-builder/client";
import { terrainPatchHandlers } from "@rpgjs/map-builder/terrain";
import MapComponent from "../components/map.ce";
import { features } from "../client-features";
import { toast, unwireControls, wireControls } from "../controls";
import { provideMain } from "../modules/main";
import { assets } from "../shared/assets";
import { MAP_SIZES, walls } from "../shared/walls";

const heroPreset = Presets.LPCSpritesheetPreset({
  id: "hero",
  imageSource: "hero.png",
  width: 1728,
  height: 5568,
  ratio: 1.5,
});

export default {
  providers: [
    provideLoadMap((id: string) => {
      const [width, height] = MAP_SIZES[id] ?? MAP_SIZES.forest!;
      return { id, component: MapComponent, width, height, data: {}, hitboxes: walls(width, height) };
    }),
    provideClientGlobalConfig({
      keyboardControls: { up: "up", down: "down", left: "left", right: "right", action: "space", dash: "shift", escape: "escape" },
    }),
    provideMain(),
    provideMapBuilderClient({
      assets,
      features,
      patchHandlers: [terrainPatchHandlers],
      view: { modes: ["play"] },
      onJoin: (handle) => {
        wireControls(handle as never);
        toast("Welcome: cut trees, pull the lever, plant with B");
      },
      onLeave: (handle) => unwireControls(handle as never),
    }),
    provideClientModules([
      {
        spritesheets: [{ ...heroPreset, id: "hero", image: "hero.png" }],
      },
    ]),
  ],
};
