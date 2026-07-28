import { createModule } from "@rpgjs/common";
import client from "./client";
import server from "./server";

export function provideFarm() {
  return createModule("farm-hotbar-playground", [
    {
      client,
      server,
    },
  ]);
}
