import { createServer, provideServerModules } from "@rpgjs/server";
import { mapBuilderServer } from "./game";
import { provideMain } from "./modules/main";

export default createServer({
  providers: [mapBuilderServer(), provideMain(), provideServerModules([])],
});
