import { createServer, provideServerModules } from "@rpgjs/server";
import { provideFarm } from "./modules/farm";

export default createServer({
  providers: [
    provideFarm(),
    provideServerModules([]),
  ],
});
