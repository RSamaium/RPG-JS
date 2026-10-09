import { describe, expect, expectTypeOf, test } from "vitest";
import { createModule, defineModule } from "./modules";

describe("canonical module helpers", () => {
  test("defineModule preserves the precise module type and value", () => {
    const module = defineModule({
      engine: {
        onStart: () => "started" as const,
      },
    });

    expect(module.engine.onStart()).toBe("started");
    expectTypeOf(module.engine.onStart).returns.toEqualTypeOf<"started">();
  });

  test("createModule keeps advanced client/server composition isolated", () => {
    const server = { player: { onConnected: () => undefined } };
    const client = { engine: { onStart: () => undefined } };
    const providers = createModule("Feature", [{ server, client }]);

    expect(providers).toHaveLength(2);
    expect(providers[0]).toMatchObject({
      provide: "FeatureModuleServer",
      meta: { server: true, isModule: true },
    });
    expect(providers[1]).toMatchObject({
      provide: "FeatureModuleClient",
      meta: { client: true, isModule: true },
    });
  });
});
