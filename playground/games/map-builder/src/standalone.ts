import { provideRpg, startGame } from "@rpgjs/client";
import startServer from "./server";
import configClient from "./config/config.client";

startGame({
  ...configClient,
  providers: [configClient.providers, provideRpg(startServer)],
});
