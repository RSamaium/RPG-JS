import { GamepadControls } from "canvasengine";

/**
 * Gamepad configuration shared by the menu-like GUIs.
 *
 * CanvasEngine only maps A, B/Start and the left stick by default. The d-pad
 * buttons (12-15 on the standard layout) are added so menus can be navigated
 * with the cross as well as with the stick, and the shoulder buttons (L/R)
 * switch tabs when a GUI declares `tabPrev` / `tabNext` controls.
 *
 * `stepInterval` is read by the patch below: while the stick stays pushed, a
 * direction is repeated at most once per interval instead of once per frame.
 * It can also be a `{ default, up, left... }` map of intervals per control.
 */
export const menuGamepadControls = {
  enabled: true,
  stepInterval: 200,
  buttonMapping: {
    button_0: "action",
    button_1: "escape",
    button_9: "escape",
    button_4: "tabPrev",
    button_5: "tabNext",
    button_12: "up",
    button_13: "down",
    button_14: "left",
    button_15: "right",
  },
};

/**
 * Workarounds for the CanvasEngine `GamepadControls` directive.
 *
 * - A destroyed directive never unsubscribed from joypad.js, so every GUI that
 *   had been closed kept answering to the gamepad (a closed save slot list
 *   saved again, a closed submenu navigated back...).
 * - Without the Gamepad API (`window.joypad = {}`) the directive threw on init.
 * - Analog stick directions were applied on every frame, which makes menu
 *   cursors race through the entries.
 */
const patchKey = "__rpgGamepadPatched";
const proto: any = (GamepadControls as any)?.prototype;

if (proto && !proto[patchKey]) {
  proto[patchKey] = true;

  const initGamepad = proto.initGamepad;
  proto.initGamepad = function () {
    const joypad = typeof window !== "undefined" ? (window as any).joypad : undefined;
    if (!joypad) return initGamepad.call(this);
    // Without the Gamepad API joypad.js leaves an empty object behind.
    if (typeof joypad.on !== "function") return;
    const subscriptions: any[] = [];
    const on = joypad.on;
    joypad.on = function (...args: any[]) {
      const subscription = on.apply(this, args);
      subscriptions.push(subscription);
      return subscription;
    };
    try {
      initGamepad.call(this);
    } finally {
      joypad.on = on;
    }
    this.__gamepadSubscriptions = subscriptions;
  };

  const cleanup = proto.cleanup;
  proto.cleanup = function () {
    for (const subscription of this.__gamepadSubscriptions ?? []) {
      subscription?.unsubscribe?.();
    }
    this.__gamepadSubscriptions = [];
    return cleanup.call(this);
  };

  const updateGamepadConfig = proto.updateGamepadConfig;
  proto.updateGamepadConfig = function (config: any) {
    this.__stepInterval = config?.stepInterval;
    return updateGamepadConfig.call(this, config);
  };

  const applyControl = proto.applyControl;
  proto.applyControl = function (name: string, isDown?: boolean, params?: any) {
    const step = this.__stepInterval;
    const interval = typeof step === "object" ? step?.[name] ?? step?.default : step;
    if (interval && isDown === true) {
      const now = Date.now();
      const last = (this.__lastStepAt ??= {});
      if (now - (last[name] ?? 0) < interval) return Promise.resolve();
      last[name] = now;
    }
    return applyControl.call(this, name, isDown, params);
  };
}
