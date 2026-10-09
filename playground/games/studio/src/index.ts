import { provideRpg, startGame } from "@rpgjs/client";
import { configClient } from "./config/config.client";
import startServer from "./server";

startGame({
  ...configClient,
  providers: [configClient.providers, provideRpg(startServer)],
});
