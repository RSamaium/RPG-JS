import { inject, RpgClientEngine } from "@rpgjs/client";
// @ts-ignore CanvasEngine components are compiled by @canvasengine/compiler.
import ActionBarComponent from "./components/action-bar.ce";
// @ts-ignore CanvasEngine components are compiled by @canvasengine/compiler.
import TargetingOverlayComponent from "./components/targeting-overlay.ce";
// @ts-ignore CanvasEngine components are compiled by @canvasengine/compiler.
import AttackPreviewComponent from "./components/attack-preview.ce";
// @ts-ignore CanvasEngine components are compiled by @canvasengine/compiler.
import CombatInputComponent from "./components/combat-input.ce";
import type {
  ActionBattleUiActionBarOptions,
  ActionBattleUiAttackPreviewOptions,
  ActionBattleUiOptions,
  ActionBattleUiTargetingOptions,
} from "./types";

export const ActionBattleUi = {
  ActionBar: ActionBarComponent,
  TargetingOverlay: TargetingOverlayComponent,
  AttackPreview: AttackPreviewComponent,
  CombatInput: CombatInputComponent,
};

export interface ResolvedActionBattleUi {
  gui: Array<{ id: string; component: any; dependencies?: Function }>;
  sprite: {
    componentsInFront: any[];
    componentsBehind: any[];
  };
  actionBar: ActionBattleUiActionBarOptions;
  targeting: ActionBattleUiTargetingOptions;
  attackPreview: ActionBattleUiAttackPreviewOptions;
}

const normalizeToggle = <T extends { enabled?: boolean }>(
  value: boolean | T | undefined,
  defaults: T
): T => {
  if (value === false) {
    return { ...defaults, enabled: false };
  }
  if (value === true) {
    return { ...defaults, enabled: true };
  }
  if (value === undefined) {
    return { ...defaults };
  }
  return {
    ...defaults,
    ...value,
    enabled: value.enabled ?? defaults.enabled,
  };
};

export function createActionBattleUi(
  input: "classic" | ActionBattleUiOptions = "classic"
): ActionBattleUiOptions {
  if (input === "classic") {
    return {};
  }
  return input;
}

export function resolveActionBattleUi(options: ActionBattleUiOptions = {}): ResolvedActionBattleUi {
  const actionBar = normalizeToggle(options.actionBar, {
    enabled: false,
    autoOpen: false,
    mode: "both",
    component: ActionBattleUi.ActionBar,
  });
  const targeting = normalizeToggle(options.targeting, {
    enabled: true,
    showGrid: true,
    component: ActionBattleUi.TargetingOverlay,
    colors: {
      area: 0x2f9ef7,
      edge: 0x1b6a98,
      cursor: 0xffd166,
    },
  });
  const attackPreview = normalizeToggle(options.attackPreview, {
    enabled: true,
    component: ActionBattleUi.AttackPreview,
  });
  const gui = [...(options.gui ?? [])];
  if (actionBar.enabled && actionBar.component) {
    gui.unshift({
      id: "action-battle-action-bar",
      component: actionBar.component,
      dependencies: () => {
        const engine = inject(RpgClientEngine);
        return [engine.scene.currentPlayer];
      },
    });
  }
  const configuredSpriteComponents = Array.isArray(options.spriteComponents)
    ? { front: options.spriteComponents, back: [] }
    : options.spriteComponents ?? {};

  return {
    gui,
    sprite: {
      componentsInFront: [
        ...(targeting.enabled && targeting.component ? [targeting.component] : []),
        ...(attackPreview.enabled && attackPreview.component ? [attackPreview.component] : []),
        CombatInputComponent,
        ...(configuredSpriteComponents.front ?? []),
      ],
      componentsBehind: configuredSpriteComponents.back ?? [],
    },
    actionBar,
    targeting,
    attackPreview,
  };
}
