import "@rpgjs/ui-css/index.css";
import "@rpgjs/ui-css/theme-default.css";
import { accountQuery } from "@rpgjs/account/client";
import { provideMmorpg, startGame } from "@rpgjs/client";
import configClient from "./config/config.client";

startGame({
  ...configClient,
  providers: [
    configClient.providers,
    provideMmorpg({
      deferConnection: true,
      query: accountQuery,
    }),
  ],
});
