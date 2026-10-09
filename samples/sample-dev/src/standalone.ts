import { provideRpg, startGame } from "@rpgjs/client";
import startServer from "./server";
import configClient from "./config/config.client";
import { provideVueGui } from "@rpgjs/vue";

startGame({
  ...configClient,
  providers: [configClient.providers, provideRpg(startServer)],
});
