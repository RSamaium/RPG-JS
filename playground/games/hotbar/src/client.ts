import "./styles.css";
import { provideMmorpg, startGame } from "@rpgjs/client";
import startServer from "./server";
import configClient from "./config/config.client";

startGame({
  ...configClient,
  providers: [configClient.providers, provideMmorpg(startServer)],
});
