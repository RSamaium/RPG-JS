import { createModule } from "@rpgjs/common";
import server from "./server";
import client from "./client";

export function provideAreLogic() {
  return createModule("are-logic", [
    {
      server,
      client,
    },
  ]);
}
