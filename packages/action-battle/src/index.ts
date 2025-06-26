import server from "./server";
import client from "./client";
import { createModule } from "@rpgjs/common";
export { BattleAi } from "./ai.server";

export function provideActionBattle() {
  return createModule("ActionBattle", [
    {
      server,
      client,
    },
  ]); 
}
