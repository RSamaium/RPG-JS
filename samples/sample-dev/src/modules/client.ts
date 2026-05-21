import { HotbarGui, inject, RpgGui, type RpgClient, type RpgClientEngine } from "@rpgjs/client";
import { defineModule } from "@rpgjs/common";

export default defineModule<RpgClient>({
  sceneMap: {
    async onAfterLoading() {
      const gui = inject(RpgGui);
      gui.display(HotbarGui.Hotbar);
    },
  },
});
