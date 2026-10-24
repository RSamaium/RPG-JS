import { createServer, provideServerModules } from "@rpgjs/server";
import { provideScripts } from "@rpgjs/script/server";
import town from "./modules/town/server";
import chest from "./scripts/chest";
import shop from "./scripts/shop";
import trap from "./scripts/trap";
import zone from "./scripts/zone";

export default createServer({
  providers: [
    // The gameplay of the town is written as scripts: they listen to the signals of the game (see ./scripts).
    provideScripts({
      scripts: [
        { id: "chest", source: chest },
        { id: "shop", source: shop },
        { id: "trap", source: trap },
        { id: "zone", source: zone },
      ],
    }),
    provideServerModules([town]),
  ],
});
