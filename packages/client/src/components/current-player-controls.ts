import { effect, type ControlsDirective } from "canvasengine";
import type { Subscription } from "rxjs";

// Mount callbacks run outside CanvasEngine's automatic subscription tracking.
// Return the effect's actual RxJS subscription for synchronous teardown.
export function observeCurrentPlayerControls(
  isCurrentPlayer: () => boolean,
  controls: ControlsDirective,
  register: (controls: ControlsDirective) => void,
): Subscription {
  return effect(() => {
    if (isCurrentPlayer()) register(controls);
  }).subscription;
}
