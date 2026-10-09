import { afterEach, describe, expect, test, vi } from "vitest";
import { provideVueGui, vueGui } from "./provider";
import { VueGui, VueGuiToken } from "./VueGui";

describe("provideVueGui", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("marks GUI registrations as Vue-owned", () => {
    const component = { name: "Inventory" };

    expect(vueGui({
      id: "inventory",
      component,
    })).toEqual({
      id: "inventory",
      component,
      renderer: "vue",
    });
  });

  test("registers the module client hook and VueGui factory", () => {
    const providers = provideVueGui({
      selector: "#overlay",
      createIfNotFound: true,
    }) as any[];
    const clientModule = providers.find((provider) => provider.provide === "VueGuiModuleClient");
    const factoryProvider = providers.find((provider) => provider.provide === VueGuiToken);

    expect(clientModule).toMatchObject({
      provide: "VueGuiModuleClient",
      meta: { client: true, isModule: true },
    });
    expect(clientModule.useValue.server).toBeNull();
    expect(typeof clientModule.useValue.client.engine.onStart).toBe("function");

    expect(factoryProvider.provide).toBe(VueGuiToken);
    expect(factoryProvider.useFactory({ side: "client" })).toBeInstanceOf(VueGui);
  });

  test("does not create VueGui on the server side", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const providers = provideVueGui() as any[];
    const factoryProvider = providers.find((provider) => provider.provide === VueGuiToken);

    expect(factoryProvider.useFactory({ side: "server" })).toBeNull();
    expect(warn).toHaveBeenCalledWith("VueGui is only available on client side");
  });
});
