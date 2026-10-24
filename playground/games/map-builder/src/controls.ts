import { bindKeyboard } from "@rpgjs/map-builder/interaction";
import type { MapBuilderHandle } from "@rpgjs/map-builder/client";
import type { elements, placement, selection, terrain } from "@rpgjs/map-builder/features";

type Features = readonly [ReturnType<typeof terrain>, ReturnType<typeof elements>, ReturnType<typeof selection>, ReturnType<typeof placement<typeof import("./shared/rules").catalog>>];

const WORDS: Record<string, string> = {
  occupied: "Something is in the way",
  "out-of-bounds": "That is outside the map",
  "protected-zone": "You cannot build here",
  "max-count": "There are enough trees already",
  "not-enough-wood": "You need 1 wood to plant a tree",
  "rate-limit": "Slow down!",
  "not-owner": "That is not yours",
  "unknown-intent": "Not allowed",
  timeout: "The server did not answer",
  "wrong-ground": "You can only till grass and dirt",
  "outside-map": "That is outside the map",
  "no-terrain": "This map has no ground to paint",
};

let toastTimer: ReturnType<typeof setTimeout> | undefined;
let lastToastedRejection: string | undefined;

/** A line of text at the bottom of the page, for what the server decided. */
export function toast(text: string): void {
  if (typeof document === "undefined") return;
  let element = document.getElementById("woodcutter-toast");
  if (!element) {
    element = document.createElement("div");
    element.id = "woodcutter-toast";
    Object.assign(element.style, {
      position: "fixed", left: "50%", bottom: "28px", transform: "translateX(-50%)", padding: "8px 14px",
      background: "rgba(20,28,24,.88)", color: "#fff", font: "14px/1.2 Arial, sans-serif", borderRadius: "6px",
      pointerEvents: "none", zIndex: "10", transition: "opacity .2s",
    });
    document.body.appendChild(element);
  }
  element.textContent = text;
  element.style.opacity = "1";
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => void (element!.style.opacity = "0"), 2200);
}

function hint(): void {
  if (typeof document === "undefined" || document.getElementById("woodcutter-hint")) return;
  const element = document.createElement("div");
  element.id = "woodcutter-hint";
  element.textContent = "Space: chop a tree, pull a lever · B: plant an oak · N: plant a bush · T: till (dirt) · G: restore grass · E: edit (drag, Delete) · Esc: cancel";
  Object.assign(element.style, {
    position: "fixed", left: "12px", top: "10px", padding: "6px 10px", background: "rgba(20,28,24,.78)", color: "#fff",
    font: "12px/1.3 Arial, sans-serif", borderRadius: "6px", pointerEvents: "none", zIndex: "10",
  });
  document.body.appendChild(element);
}

const cleanups = new WeakMap<object, () => void>();

/** What the player can do on a modifiable map. Called when they join one. */
export function wireControls(handle: MapBuilderHandle<Features>): void {
  const { view } = handle;
  hint();
  // For the browser console: `__mapBuilder.remote.model.state`, `__mapBuilder.view.effects`…
  (window as unknown as { __mapBuilder?: unknown }).__mapBuilder = handle;

  const unbindKeys = bindKeyboard(view.interaction, window);
  const stopTerrainRejections = view.interaction.state.subscribe((snapshot) => {
    const reason = snapshot.lastRejection?.reason;
    if (reason && WORDS[reason] && reason !== lastToastedRejection) toast(WORDS[reason]!);
    lastToastedRejection = reason;
  });
  const stopRejected = view.placement.onRejected((event) => toast(WORDS[event.reason] ?? event.message));
  const stopPlaced = view.placement.onPlaced(() => toast("Planted"));

  const onKey = (event: KeyboardEvent): void => {
    if ((event.target as HTMLElement | null)?.tagName === "INPUT") return;
    const key = event.key.toLowerCase();
    if (key === "b" || key === "n") {
      const item = key === "b" ? "oak" : "bush";
      if (view.placement.active === item) view.placement.cancel();
      else view.placement.start(item);
    } else if (key === "t" || key === "g") {
      const material = key === "t" ? "dirt" : "grass";
      const brush = view.terrain.brush;
      if (!brush) return toast("This map has no ground to paint");
      if (brush.active?.material === material) {
        brush.stop();
        toast("Brush put away");
      } else {
        view.placement.cancel();
        brush.start({ material, radius: 22 });
        toast(material === "dirt" ? "Tilling: drag to turn grass into dirt" : "Restoring: drag to turn dirt back into grass");
      }
    } else if (key === "e") {
      const editing = view.interaction.modes.includes("edit");
      view.interaction.setModes(editing ? ["play"] : ["play", "edit"]);
      toast(editing ? "Edit mode off" : "Edit mode on: drag what you planted, Delete removes it");
    }
  };
  window.addEventListener("keydown", onKey);

  cleanups.set(handle, () => {
    unbindKeys();
    stopRejected();
    stopTerrainRejections();
    stopPlaced();
    window.removeEventListener("keydown", onKey);
  });
}

export function unwireControls(handle: MapBuilderHandle<Features>): void {
  cleanups.get(handle)?.();
  cleanups.delete(handle);
}
