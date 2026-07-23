import { createModule } from "@rpgjs/common";
import client from "./client";
import server from "./server";

export function provideMain() {
  return createModule("chat-playground", [
    {
      client,
      server,
    },
  ]);
}
