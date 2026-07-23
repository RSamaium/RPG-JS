import { describe, expectTypeOf, test } from "vitest";
import type {
  RpgContext,
  RpgFactoryProvider,
  RpgProvider,
  RpgProviders,
  RpgReadableSignal,
  RpgWritableSignal,
} from "./foundation";

describe("RPGJS public foundation contracts", () => {
  test("signals expose the stable gameplay operations", () => {
    const assertions = (
      readable: RpgReadableSignal<number>,
      writable: RpgWritableSignal<number>,
    ) => {
      expectTypeOf(readable()).toEqualTypeOf<number>();
      expectTypeOf(writable()).toEqualTypeOf<number>();
      expectTypeOf(writable.set).parameter(0).toEqualTypeOf<number>();
      expectTypeOf(writable.update).parameter(0).toEqualTypeOf<(value: number) => number>();
      expectTypeOf(writable.mutate).parameter(0).toEqualTypeOf<(value: number) => void>();
    };

    expectTypeOf(assertions).toBeFunction();
  });

  test("providers use the RPGJS-owned context boundary", () => {
    const provider = {
      provide: "counter",
      useFactory(context) {
        context.set("counter", 1);
        return context.get<number>("counter");
      },
    } satisfies RpgFactoryProvider<number>;

    expectTypeOf(provider).toMatchTypeOf<RpgProvider<number>>();
    expectTypeOf([provider]).toMatchTypeOf<RpgProviders>();
    expectTypeOf(provider.useFactory).parameter(0).toEqualTypeOf<RpgContext>();
  });
});
