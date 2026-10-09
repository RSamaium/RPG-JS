import { describe, expect, test } from "vitest";
import { createServer } from "./setup";

describe("createServer", () => {
  test("initializes recursively nested RPGJS providers", async () => {
    const sentinel = new Error("deep provider initialized");
    const Server = createServer({
      providers: [
        [
          [
            {
              provide: "deep-provider",
              useFactory() {
                throw sentinel;
              },
            },
          ],
        ],
      ],
    });
    const server = new Server({
      id: "lobby-1",
      storage: {},
    } as never);

    await expect(server.onStart()).rejects.toBe(sentinel);
  });
});
