import { describe, expect, it, vi } from "vitest";
import { patchWeatherTickLifecycle } from "./weather-tick-lifecycle";

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

describe("patchWeatherTickLifecycle", () => {
  it("stops a tick subscription created by a mount that finishes after destroy", async () => {
    const started = deferred();
    const mounted = deferred();
    const unsubscribe = vi.fn();
    const prototype = {
      async onMount(this: any) {
        started.resolve();
        await mounted.promise;
        this.tickSubscription = { unsubscribe };
      },
      onDestroy() {},
    };
    patchWeatherTickLifecycle(prototype);

    const instance = Object.create(prototype);
    const mounting = instance.onMount();
    await started.promise;
    instance.onDestroy();
    mounted.resolve();
    await mounting;

    expect(unsubscribe).toHaveBeenCalledOnce();
    expect(instance.tickSubscription).toBeUndefined();
  });

  it("serializes remounts and replaces the previous tick subscription", async () => {
    const subscriptions = [
      { unsubscribe: vi.fn() },
      { unsubscribe: vi.fn() },
    ];
    const prototype = {
      mountCount: 0,
      async onMount(this: any) {
        await Promise.resolve();
        this.tickSubscription = subscriptions[this.mountCount++];
      },
      onDestroy() {},
    };
    patchWeatherTickLifecycle(prototype);

    const instance = Object.create(prototype);
    await Promise.all([instance.onMount(), instance.onMount()]);

    expect(subscriptions[0].unsubscribe).toHaveBeenCalledOnce();
    expect(subscriptions[1].unsubscribe).not.toHaveBeenCalled();
    expect(instance.tickSubscription).toBe(subscriptions[1]);
  });
});
