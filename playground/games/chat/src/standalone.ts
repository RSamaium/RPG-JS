import "@rpgjs/ui-css/index.css";
import "@rpgjs/ui-css/theme-pixel.css";
import "./style.css";
import { provideRpg, startGame } from "@rpgjs/client";
import startServer from "./server";
import configClient from "./config/config.client";

startGame({
  ...configClient,
  providers: [configClient.providers, provideRpg(startServer)],
});
