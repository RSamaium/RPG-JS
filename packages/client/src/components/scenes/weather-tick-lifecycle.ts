const PATCHED = Symbol.for("@rpgjs/client/weather-tick-lifecycle-patched");
const DISPOSED = Symbol("weather-tick-lifecycle-disposed");
const MOUNT_QUEUE = Symbol("weather-tick-lifecycle-mount-queue");

type TickSubscription = {
  unsubscribe?: () => void;
};

type TickSubscriptionInstance = {
  destroyed?: boolean;
  tickSubscription?: TickSubscription;
  [DISPOSED]?: boolean;
  [MOUNT_QUEUE]?: Promise<void>;
};

type TickSubscriptionPrototype = {
  [PATCHED]?: boolean;
  onMount?: (...args: any[]) => unknown;
  onDestroy?: (...args: any[]) => unknown;
};

function stopTickSubscription(instance: TickSubscriptionInstance) {
  instance.tickSubscription?.unsubscribe?.();
  instance.tickSubscription = undefined;
}

/**
 * CanvasEngine presets 2.0.0 can finish mounting a rain layer after that layer
 * has already been destroyed. The late mount then leaves a tick subscription
 * operating on a destroyed Pixi object. It can also overwrite an existing
 * subscription when mounts overlap.
 *
 * Keep this compatibility patch local to the affected preset prototypes. It
 * can be removed once the preset owns the same lifecycle guarantees.
 */
export function patchWeatherTickLifecycle(prototype: TickSubscriptionPrototype) {
  if (!prototype || prototype[PATCHED]) return;

  const originalOnMount = prototype.onMount;
  const originalOnDestroy = prototype.onDestroy;
  if (!originalOnMount || !originalOnDestroy) return;

  Object.defineProperty(prototype, PATCHED, { value: true });

  prototype.onMount = function (this: TickSubscriptionInstance, ...args: any[]) {
    const mount = async () => {
      if (this[DISPOSED] || this.destroyed) return;

      stopTickSubscription(this);
      await originalOnMount.apply(this, args);

      if (this[DISPOSED] || this.destroyed) {
        stopTickSubscription(this);
      }
    };

    const pendingMount = (this[MOUNT_QUEUE] ?? Promise.resolve())
      .catch(() => undefined)
      .then(mount);
    this[MOUNT_QUEUE] = pendingMount;
    return pendingMount;
  };

  prototype.onDestroy = function (this: TickSubscriptionInstance, ...args: any[]) {
    this[DISPOSED] = true;
    stopTickSubscription(this);
    return originalOnDestroy.apply(this, args);
  };
}
