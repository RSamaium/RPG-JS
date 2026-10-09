import { signal, type ControlsDirective } from "canvasengine";
import { getKeyboardControlBind, isKeyboardActionConfig, keyboardEventMatchesBind } from "./actionInput";

export const movementDirections = ["up", "down", "left", "right"] as const;
export const configurableControls = [...movementDirections, "action", "escape"] as const;
type MovementDirection = typeof configurableControls[number];
type Bindings = Record<MovementDirection, unknown>;

// Internal client preference adapter. Gameplay authority remains on the server.
export function createMovementPreferences(
  controls: Record<string, unknown>,
  projectId: string,
  storage?: Pick<Storage, "getItem" | "setItem" | "removeItem">,
  onApply?: (bindings: Bindings) => void,
) {
  const defaults = Object.fromEntries(configurableControls.map(id => [id, getKeyboardControlBind(controls[id])])) as Bindings;
  const bindings = signal<Bindings>({ ...defaults });
  const storageKey = `rpgjs:movement:${projectId || "default"}`;
  const valid = (value: unknown): value is string => typeof value === "string" && /^(?:[a-z]|up|down|left|right|space|enter|escape|backspace)$/.test(value);
  const eventFor = (key: string) => ({ key: key === "space" ? " " : key, code: key, keyCode: key.length === 1 ? key.toUpperCase().charCodeAt(0) : ({ left: 37, up: 38, right: 39, down: 40, space: 32, enter: 13, escape: 27, backspace: 8 }[key]) }) as KeyboardEvent;
  const conflicts = (direction: MovementDirection, key: string, values: Bindings) => Object.entries({ ...controls, ...values }).some(([id, bind]) => id !== direction && keyboardEventMatchesBind(eventFor(key), getKeyboardControlBind(bind)));
  const apply = (values: Bindings) => {
    for (const id of configurableControls) {
      const previous = controls[id];
      controls[id] = isKeyboardActionConfig(previous) ? { ...previous, bind: values[id] } : values[id];
    }
    bindings.set({ ...values });
    onApply?.(values);
  };
  try {
    const saved = JSON.parse(storage?.getItem(storageKey) || "null");
    const values = { ...defaults, ...saved };
    if (saved && Object.keys(saved).every(id => configurableControls.includes(id as MovementDirection) && valid(saved[id]) && !conflicts(id as MovementDirection, saved[id], values))) apply(values);
  } catch { /* Storage is optional (private browsing, invalid saved data). */ }
  return {
    bindings,
    assign(direction: MovementDirection, key: string): boolean {
      if (!configurableControls.includes(direction) || !valid(key) || conflicts(direction, key, bindings())) return false;
      apply({ ...bindings(), [direction]: key });
      // Save only overrides normalized to strings; preserve configured arrays at runtime.
      try { storage?.setItem(storageKey, JSON.stringify(Object.fromEntries(configurableControls.filter(id => bindings()[id] !== defaults[id]).map(id => [id, bindings()[id]])))); } catch { /* Session-only preferences. */ }
      return true;
    },
    reset() {
      apply(defaults);
      try { storage?.removeItem(storageKey); } catch { /* Session-only preferences. */ }
    },
  };
}

const instances = new WeakMap<object, ReturnType<typeof createMovementPreferences>>();
export function refreshKeyboardBindings(active: ControlsDirective | null | undefined, bindings: Bindings) {
  if (!active?.keyboard) return;
  const options = { ...active.options };
  for (const id of configurableControls) {
    if (options[id]) options[id] = { ...options[id], bind: bindings[id] as ControlsDirective["options"][string]["bind"] };
  }
  if (options.back) options.back = { ...options.back, bind: bindings.escape as string };
  active.keyboard.setInputs(options);
}
export function movementPreferences(engine: { globalConfig: any; activeKeyboardControls?: () => ControlsDirective | null }) {
  let preferences = instances.get(engine);
  if (!preferences) {
    let storage: Storage | undefined;
    try { storage = window.localStorage; } catch { /* SSR or restricted browser. */ }
    preferences = createMovementPreferences(engine.globalConfig.keyboardControls, engine.globalConfig.projectId || engine.globalConfig._id || "default", storage, bindings => {
      // CanvasEngine 2.1 does not reliably propagate computed directive updates.
      // Refresh only the live keyboard; joystick/gamepad mappings stay unchanged.
      refreshKeyboardBindings(engine.activeKeyboardControls?.(), bindings);
    });
    instances.set(engine, preferences);
  }
  return preferences;
}
