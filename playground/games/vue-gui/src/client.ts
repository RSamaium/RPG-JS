import { provideMmorpg, startGame } from "@rpgjs/client";
import configClient from "./config/config.client";

startGame({
  ...configClient,
  providers: [configClient.providers, provideMmorpg()],
});
