import type { SceneNode } from "../renderer/scene";
import type { InteractionController, Tool } from "./controller";
import type { KeyInput, PointerInput } from "./input";
import { sameTarget, targetOf, type PickOptions, type TargetRef } from "./picking";

type Gate = (input: PointerInput | KeyInput) => boolean;

export interface PlayToolOptions {
  /** Called when the player clicks something. The game decides what that means. */
  onInteract(target: TargetRef, node: SceneNode, input: PointerInput, controller: InteractionController): void;
  /** What can be interacted with. Defaults to events only. */
  readonly types?: readonly TargetRef["type"][];
  readonly area?: PickOptions["area"];
  readonly modes?: readonly string[];
  readonly when?: Gate;
  readonly priority?: number;
}

/** Clicking in the world, as a player: the game decides what a click on something does. */
export function playTool(options: PlayToolOptions): Tool {
  return {
    id: "play",
    modes: options.modes ?? ["play"],
    ...(options.priority !== undefined ? { priority: options.priority } : {}),
    ...(options.when ? { when: options.when } : {}),
    pointerDown(input, controller) {
      if (input.button !== 0) return false;
      const node = controller.pick(input, { area: options.area ?? "bounds", types: options.types ?? ["event"] });
      if (!node) return false;
      options.onInteract(targetOf(node), node, input, controller);
      return true;
    },
  };
}

export interface HoverToolOptions {
  readonly types?: readonly TargetRef["type"][];
  readonly area?: PickOptions["area"];
  readonly modes?: readonly string[];
}

/** Only tracks what is under the pointer. This is what the `inspect` mode is made of. */
export function hoverTool(options: HoverToolOptions = {}): Tool {
  return {
    id: "hover",
    modes: options.modes ?? ["inspect"],
    pointerMove(input, controller) {
      const node = controller.pick(input, { ...(options.area ? { area: options.area } : {}), ...(options.types ? { types: options.types } : {}) });
      controller.state.update({ hovered: node ? targetOf(node) : null });
      return false;
    },
    cancel: (controller) => controller.state.update({ hovered: null }),
  };
}

export { sameTarget };
