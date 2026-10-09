import { provideMmorpg, startGame } from "@rpgjs/client";
import { configClient } from "./config/config.client";

startGame({
  ...configClient,
  providers: [
    configClient.providers,
    provideMmorpg({
      connectionIdScope: "session",
      connectionAcceptanceTimeoutMs: 30_000,
      socketOptions: { connectionTimeout: 30_000 },
    }),
  ],
});
