import { RpgClient, RpgClientEngine } from "@rpgjs/client";
import { defineModule } from "@rpgjs/common";

export default defineModule<RpgClient>({
  engine: {
    async onStart(engine: RpgClientEngine<any>) {
      console.log("[ARE-Logic] Client module initialized");
    },
  },
});
