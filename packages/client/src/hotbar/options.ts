import type { HotbarOptions, HotbarRef, ResolvedHotbarOptions } from "./types";

export const DEFAULT_HOTBAR_BINDINGS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"];

export function resolveHotbarOptions(options: HotbarOptions = {}): ResolvedHotbarOptions {
  const slots = Math.max(1, Math.floor(options.slots ?? DEFAULT_HOTBAR_BINDINGS.length));
  const bindings = normalizeBindings(slots, options.bindings);

  return {
    enabled: options.enabled !== false,
    slots,
    bindings,
    storageKey: options.storageKey === undefined ? "default" : options.storageKey,
    initialRefs: normalizeRefs(options.initialRefs ?? [], slots),
    autoDisplay: options.autoDisplay !== false,
    component: options.component,
    assignComponent: options.assignComponent,
    position: options.position ?? "bottom",
    className: options.className ?? "",
  };
}

export function normalizeRefs(refs: Array<HotbarRef | null>, slots: number): Array<HotbarRef | null> {
  return Array.from({ length: slots }, (_, index) => {
    const ref = refs[index];
    if (!ref || typeof ref.type !== "string" || typeof ref.id !== "string") return null;
    return {
      type: ref.type,
      id: ref.id,
    };
  });
}

function normalizeBindings(slots: number, bindings?: string[]): string[] {
  return Array.from({ length: slots }, (_, index) => {
    return bindings?.[index] ?? DEFAULT_HOTBAR_BINDINGS[index] ?? String(index + 1);
  });
}
