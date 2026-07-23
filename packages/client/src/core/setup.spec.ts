import { describe, expect, test } from "vitest";
import { RpgClientEngine } from "../RpgClientEngine";
import { inject } from "./inject";
import { startGame } from "./setup";

describe("startGame", () => {
  test("initializes recursively nested RPGJS providers", async () => {
    let engineStarted = false;

    const context = await startGame({
      providers: [
        [
          [
            {
              provide: "deep-provider",
              useValue: 42,
            },
          ],
        ],
        {
          provide: RpgClientEngine,
          useValue: {
            async start() {
              engineStarted = true;
            },
          },
        },
      ],
    });

    expect(context.side).toBe("client");
    expect(inject("deep-provider")).toBe(42);
    expect(engineStarted).toBe(true);
  });
});
