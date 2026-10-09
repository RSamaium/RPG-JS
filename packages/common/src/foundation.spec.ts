import { describe, expectTypeOf, test } from "vitest";
import type {
  RpgClassProvider,
  RpgContext,
  RpgExistingProvider,
  RpgFactoryProvider,
  RpgProvider,
  RpgProviders,
  RpgReadableSignal,
  RpgValueProvider,
  RpgWritableSignal,
} from "./foundation";
import type { RpgRoomDescriptor, RpgRoomTarget } from "./gameplay-room";

describe("RPGJS public foundation contracts", () => {
  test("gameplay room destinations have a serializable public contract", () => {
    const target = {
      kind: "battle",
      params: { id: "encounter-42", round: 2 },
    } satisfies RpgRoomTarget;
    const descriptor: RpgRoomDescriptor = {
      id: "battle-encounter-42",
      kind: target.kind,
      name: "encounter-42",
    };

    expectTypeOf(target.params.id).toEqualTypeOf<string>();
    expectTypeOf(descriptor.kind).toEqualTypeOf<string>();
  });
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

  test("provider factories may initialize asynchronously", () => {
    const provider = {
      provide: "counter",
      useFactory: async () => 1,
    } satisfies RpgFactoryProvider<number>;

    expectTypeOf(provider).toMatchTypeOf<RpgProvider<number>>();
    expectTypeOf(provider.useFactory()).toEqualTypeOf<Promise<number>>();
  });

  test("all documented provider strategies compose in nested lists", () => {
    class InventoryService {
      enabled = true;
    }

    const valueProvider = {
      provide: "inventory-config",
      useValue: { capacity: 20 },
    } satisfies RpgValueProvider<{ capacity: number }>;
    const classProvider = {
      provide: InventoryService,
      useClass: InventoryService,
    } satisfies RpgClassProvider<InventoryService>;
    const factoryProvider = {
      provide: "inventory",
      deps: ["inventory-config"],
      useFactory: async (context: RpgContext) => ({
        capacity: context.get<{ capacity: number }>("inventory-config").capacity,
      }),
    } satisfies RpgFactoryProvider<{ capacity: number }>;
    const existingProvider = {
      provide: "inventory-alias",
      useExisting: "inventory",
    } satisfies RpgExistingProvider;

    const providers = [
      valueProvider,
      [classProvider, factoryProvider, existingProvider],
    ] satisfies RpgProviders;

    expectTypeOf(providers).toMatchTypeOf<RpgProviders>();
  });

  test("providers accept exactly one creation strategy", () => {
    // @ts-expect-error useValue and useFactory are mutually exclusive
    const provider: RpgProvider<number> = {
      provide: "counter",
      useValue: 1,
      useFactory: () => 2,
    };

    expectTypeOf(provider).toEqualTypeOf<RpgProvider<number>>();
  });

  test("every pair of provider creation strategies is rejected", () => {
    // @ts-expect-error useClass and useExisting are mutually exclusive
    const classAlias: RpgProvider = {
      provide: "inventory",
      useClass: class InventoryService {},
      useExisting: "existing-inventory",
    };

    expectTypeOf(classAlias).toEqualTypeOf<RpgProvider>();
  });
});
