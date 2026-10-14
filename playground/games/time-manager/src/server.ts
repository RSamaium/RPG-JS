import { createServer, provideServerModules } from "@rpgjs/server";
import { provideMain } from "./modules/main";
import { timeManagerModule } from "./modules/time";

export default createServer({
  providers: [
    provideMain(),
    provideServerModules([
      timeManagerModule,
    ]),
  ],
});
