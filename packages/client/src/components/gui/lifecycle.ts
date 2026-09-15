import { effect, signal, untracked } from "canvasengine";

export function selectionSound(readSelection: () => string | number, play: () => void) {
  let previous = readSelection();
  effect(() => {
    const next = readSelection();
    if (next !== previous) { previous = next; untracked(play); }
  });
}

type InputHost = { stopProcessingInput: boolean };
const locks = new WeakMap<InputHost, { count: number; previous: boolean }>();

// Nested GUIs retain the lock until their exit animation and input dispatch end.
export function lockGuiInput(host: InputHost): () => void {
  const state = locks.get(host) ?? { count: 0, previous: host.stopProcessingInput };
  state.count++;
  locks.set(host, state);
  host.stopProcessingInput = true;
  let released = false;
  return () => {
    if (released) return;
    released = true;
    setTimeout(() => {
      if (--state.count > 0) return;
      host.stopProcessingInput = state.previous;
      locks.delete(host);
    }, 50);
  };
}

export function guiTransition() {
  const closing = signal(false);
  let timer: ReturnType<typeof setTimeout> | undefined;
  return {
    closing,
    finish(callback: () => void) {
      if (closing()) return;
      closing.set(true);
      const reduced = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
      timer = setTimeout(callback, reduced ? 0 : 180);
    },
    dispose() { if (timer) clearTimeout(timer); },
  };
}
