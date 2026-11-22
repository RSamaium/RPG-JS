import { back, confirm, cycleSpeed, inBattle, moveMenu, skipCutin } from "./session";
import { cinematic, cutin, phase } from "./state";

/**
 * Keyboard + gamepad while a battle is shown. Listens in the capture phase so
 * the map controls (and the RPGJS menu) never see battle key presses.
 */
export function installInput(): () => void {
  const onKey = (e: KeyboardEvent) => {
    // The RPGJS cinematic player handles its own keys (Escape = skip).
    if (!inBattle() || cinematic()) return;
    const target = e.target as HTMLElement | null;
    if (target && /input|textarea/i.test(target.tagName)) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    if (e.type !== "keydown" || e.repeat && !/Arrow/.test(e.key)) return;
    dispatch(e.key);
  };
  window.addEventListener("keydown", onKey, true);
  window.addEventListener("keyup", onKey, true);

  let raf = 0;
  const held = new Set<number>();
  const buttons: Record<number, string> = { 0: "Enter", 1: "Escape", 3: "Tab", 12: "ArrowUp", 13: "ArrowDown", 14: "ArrowLeft", 15: "ArrowRight" };
  const poll = () => {
    raf = requestAnimationFrame(poll);
    if (!inBattle()) return;
    const pad = navigator.getGamepads?.().find((p) => p);
    if (!pad) return;
    for (const [index, key] of Object.entries(buttons)) {
      const pressed = pad.buttons[+index]?.pressed;
      if (pressed && !held.has(+index)) dispatch(key);
      if (pressed) held.add(+index);
      else held.delete(+index);
    }
  };
  raf = requestAnimationFrame(poll);

  return () => {
    window.removeEventListener("keydown", onKey, true);
    window.removeEventListener("keyup", onKey, true);
    cancelAnimationFrame(raf);
  };
}

function dispatch(key: string) {
  if (cutin()) {
    if (key === "Enter" || key === " " || key === "Escape") skipCutin();
    return;
  }
  if (key === "Tab") return cycleSpeed();
  if (phase() === "playing") return;
  switch (key) {
    case "ArrowUp":
    case "ArrowLeft":
    case "w":
    case "a":
      return moveMenu(-1);
    case "ArrowDown":
    case "ArrowRight":
    case "s":
    case "d":
      return moveMenu(1);
    case "Enter":
    case " ":
      return confirm();
    case "Escape":
    case "Backspace":
      return back();
  }
}
