// @ts-ignore CanvasEngine components are compiled by @canvasengine/compiler.
import TargetingOverlayComponent from "./components/targeting-overlay.ce";
// @ts-ignore CanvasEngine components are compiled by @canvasengine/compiler.
import AttackPreviewComponent from "./components/attack-preview.ce";
// @ts-ignore CanvasEngine components are compiled by @canvasengine/compiler.
import CombatInputComponent from "./components/combat-input.ce";
import type {
  ActionBattleUiHotbarOptions,
  ActionBattleUiAttackPreviewOptions,
  ActionBattleUiOptions,
  ActionBattleUiTargetingOptions,
} from "./types";

export const ActionBattleUi = {
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
  hotbar: ActionBattleUiHotbarOptions;
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
  const hotbar = normalizeToggle(options.hotbar, {
    enabled: false,
    autoOpen: false,
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
    hotbar,
    targeting,
    attackPreview,
  };
}
