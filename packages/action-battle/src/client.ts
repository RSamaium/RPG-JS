import { PrebuiltEffects, RpgClient } from "@rpgjs/client";
import { defineModule } from "@rpgjs/common";

export default defineModule<RpgClient>({
   effects: [
      {
        id: 'hit',
        component: PrebuiltEffects.Hit
      }
   ]
})