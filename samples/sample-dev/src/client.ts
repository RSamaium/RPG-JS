import { startGame, provideMmorpg } from "@rpgjs/client";
import configClient from "./config/config.client";

startGame({
  ...configClient,
  // Use one player id per page instance to avoid stale session restore during dev reloads.
  providers: [configClient.providers, provideMmorpg({})],
});
