import { startGame, provideMmorpg } from "@rpgjs/client";
import configClient from "./config/config.client";

startGame({
  ...configClient,
  providers: [
    configClient.providers,
    provideMmorpg({ connectionIdScope: "ephemeral" }),
  ],
});
