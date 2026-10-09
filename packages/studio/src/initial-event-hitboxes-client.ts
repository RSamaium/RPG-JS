export type StudioEventHitboxSize = {
  width: number;
  height: number;
};

const DEFAULT_EVENT_HITBOX: StudioEventHitboxSize = {
  width: 32,
  height: 32,
};

const sameHitbox = (
  first?: StudioEventHitboxSize,
  second?: StudioEventHitboxSize,
): boolean => {
  return first?.width === second?.width && first?.height === second?.height;
};

const sceneHydrationCleanups = new WeakMap<object, () => void>();

const normalizeHitboxDimension = (value: unknown): number | undefined => {
  const number = typeof value === "string" ? Number(value) : value;
  if (typeof number !== "number" || !Number.isFinite(number) || number <= 0) {
    return undefined;
  }
  return Math.round(number);
};

const normalizeHitbox = (value: unknown): StudioEventHitboxSize | undefined => {
  if (!value || typeof value !== "object") return undefined;
  const record = value as Record<string, unknown>;
  const width = normalizeHitboxDimension(record.width ?? record.w);
  const height = normalizeHitboxDimension(record.height ?? record.h);
  return width && height ? { width, height } : undefined;
};

const collectStudioMapEvents = (scene: any): any[] => {
  const data = typeof scene?.data === "function" ? scene.data() : scene?.data;
  return [
    ...(Array.isArray(data?.events) ? data.events : []),
    ...(Array.isArray(data?.data?.events) ? data.data.events : []),
  ];
};

const resolveStudioEventHitbox = (event: any): StudioEventHitboxSize | undefined => {
  const triggerHitbox = Array.isArray(event?.triggers)
    ? [...event.triggers]
      .reverse()
      .find((trigger: any) => trigger?.enabled !== false && normalizeHitbox(trigger?.hitbox))
      ?.hitbox
    : undefined;

  return (
    normalizeHitbox(event?.hitbox) ??
    normalizeHitbox(triggerHitbox) ??
    normalizeHitbox(event?.params?.hitbox)
  );
};

const readEventHitbox = (event: any): StudioEventHitboxSize | undefined => {
  return normalizeHitbox(
    typeof event?.hitbox === "function" ? event.hitbox() : event?.hitbox,
  );
};

const applyEventHitbox = (
  event: any,
  hitbox: StudioEventHitboxSize,
): void => {
  if (sameHitbox(readEventHitbox(event), hitbox)) return;

  if (typeof event?.setHitbox === "function") {
    event.setHitbox(hitbox.width, hitbox.height);
  }

  if (sameHitbox(readEventHitbox(event), hitbox)) return;

  if (typeof event?.hitbox?.set === "function") {
    event.hitbox.set({
      w: hitbox.width,
      h: hitbox.height,
    });
  }
};

const collectConfiguredEventHitboxes = (scene: any): Map<string, StudioEventHitboxSize> => {
  const configuredEvents = new Map<string, any>();
  for (const event of collectStudioMapEvents(scene)) {
    const ids = [
      event?.runtimeEventId,
      event?.eventId,
      event?.id,
      event?._id,
    ]
      .filter((value): value is string => typeof value === "string" && value.length > 0);
    ids.forEach((id) => configuredEvents.set(id, event));
  }

  const configuredHitboxes = new Map<string, StudioEventHitboxSize>();
  configuredEvents.forEach((event, id) => {
    const hitbox = resolveStudioEventHitbox(event);
    if (hitbox) configuredHitboxes.set(id, hitbox);
  });
  return configuredHitboxes;
};

const readSceneEvents = (scene: any): Record<string, any> => {
  return typeof scene?.events === "function" ? scene.events() : {};
};

export const bindInitialStudioEventHitboxes = (scene: any): (() => void) | undefined => {
  if (scene && typeof scene === "object") {
    sceneHydrationCleanups.get(scene)?.();
  }

  const pendingHitboxes = collectConfiguredEventHitboxes(scene);
  if (pendingHitboxes.size === 0) return undefined;

  let subscription: { unsubscribe?: () => void } | undefined;
  let cleanedUp = false;

  const cleanup = () => {
    if (cleanedUp) return;
    cleanedUp = true;
    subscription?.unsubscribe?.();
    if (scene && typeof scene === "object") {
      sceneHydrationCleanups.delete(scene);
    }
  };

  if (scene && typeof scene === "object") {
    sceneHydrationCleanups.set(scene, cleanup);
  }

  const applyPendingHitboxes = () => {
    if (cleanedUp) return;
    const events = readSceneEvents(scene);
    for (const [id, configuredHitbox] of pendingHitboxes) {
      const event = events?.[id];
      if (!event) continue;

      const currentHitbox = readEventHitbox(event);
      if (currentHitbox && !sameHitbox(currentHitbox, DEFAULT_EVENT_HITBOX)) {
        pendingHitboxes.delete(id);
        continue;
      }

      applyEventHitbox(event, configuredHitbox);
      pendingHitboxes.delete(id);
    }

    if (pendingHitboxes.size === 0) {
      cleanup();
    }
  };

  applyPendingHitboxes();

  if (pendingHitboxes.size > 0) {
    const observable = scene?.events?.observable;
    if (observable && typeof observable.subscribe === "function") {
      subscription = observable.subscribe(() => applyPendingHitboxes());
    }
  }

  applyPendingHitboxes();
  return cleanup;
};
