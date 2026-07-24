import { ActionBattleOptions } from "./types";
import { normalizeActionBattleAttackProfile } from "./core/attack-profile";

export const DEFAULT_ACTION_BATTLE_OPTIONS: ActionBattleOptions = {
  ui: {
    actionBar: {
      enabled: false,
      autoOpen: false,
      mode: "both",
    },
    targeting: {
      enabled: true,
      showGrid: true,
      colors: {
        area: 0x2f9ef7,
        edge: 0x1b6a98,
        cursor: 0xffd166,
      },
    },
  },
  skills: {
    defaultAoeMask: ["#"],
  },
  targeting: {
    affects: "events",
    allowEmptyTarget: true,
  },
  attack: {
    lockMovement: true,
    lockDurationMs: 350,
    showPreview: true,
    previewDurationMs: 180,
    previewColor: 0xfff3b0,
    previewAccentColor: 0xffffff,
  },
  animations: {},
};

let currentActionBattleOptions: ActionBattleOptions =
  DEFAULT_ACTION_BATTLE_OPTIONS;

export function normalizeActionBattleOptions(
  options: ActionBattleOptions = {}
): ActionBattleOptions {
  const combat = {
    ...DEFAULT_ACTION_BATTLE_OPTIONS.systems?.combat,
    ...options.systems?.combat,
    ...options.combat,
    hooks: {
      ...DEFAULT_ACTION_BATTLE_OPTIONS.systems?.combat?.hooks,
      ...options.systems?.combat?.hooks,
      ...options.combat?.hooks,
    },
  };
  const attack = {
    ...DEFAULT_ACTION_BATTLE_OPTIONS.attack,
    ...options.attack,
    ...combat.attack,
  };
  const attackProfile = normalizeActionBattleAttackProfile(attack.profile, {
    lockMovement: attack.lockMovement,
    lockDurationMs: attack.lockDurationMs,
    hitboxes: attack.hitboxes,
  });
  const normalizedAttack = {
    ...attack,
    profile: attackProfile,
  };
  const skills = {
    ...DEFAULT_ACTION_BATTLE_OPTIONS.skills,
    ...options.skills,
  };
  skills.targeting = skills.targeting ?? skills.getTargeting;
  skills.getTargeting = skills.getTargeting ?? skills.targeting;

  const defaultActionBar = DEFAULT_ACTION_BATTLE_OPTIONS.ui?.actionBar as any;
  const defaultTargeting = DEFAULT_ACTION_BATTLE_OPTIONS.ui?.targeting as any;
  const optionActionBar = options.ui?.actionBar as any;
  const optionTargeting = options.ui?.targeting as any;
  const optionAttackPreview = options.ui?.attackPreview as any;
  const actionBar =
    options.ui?.actionBar === false
      ? { ...defaultActionBar, enabled: false }
      : {
          ...defaultActionBar,
          ...(options.ui?.actionBar === true ? { enabled: true } : optionActionBar),
        };
  const legacyPreviewEnabled = normalizedAttack.showPreview !== false;
  const attackPreview =
    options.ui?.attackPreview === false
      ? { enabled: false }
      : {
          enabled: options.ui?.attackPreview === true ? true : legacyPreviewEnabled,
          ...(options.ui?.attackPreview === true ? {} : optionAttackPreview),
        };
  const targeting =
    options.ui?.targeting === false
      ? { ...defaultTargeting, enabled: false }
      : {
          ...defaultTargeting,
          ...(options.ui?.targeting === true ? { enabled: true } : optionTargeting),
          colors: {
            ...defaultTargeting?.colors,
            ...(typeof options.ui?.targeting === "object"
              ? optionTargeting?.colors
              : undefined),
          },
        };
  const ai = {
    ...DEFAULT_ACTION_BATTLE_OPTIONS.systems?.ai,
    ...options.systems?.ai,
    ...options.ai,
    actions: {
      ...DEFAULT_ACTION_BATTLE_OPTIONS.systems?.ai?.actions,
      ...options.systems?.ai?.actions,
      ...options.ai?.actions,
    },
    behaviors: {
      ...DEFAULT_ACTION_BATTLE_OPTIONS.systems?.ai?.behaviors,
      ...options.systems?.ai?.behaviors,
      ...options.ai?.behaviors,
    },
    presets: {
      ...DEFAULT_ACTION_BATTLE_OPTIONS.systems?.ai?.presets,
      ...options.systems?.ai?.presets,
      ...options.ai?.presets,
    },
    visuals: {
      ...DEFAULT_ACTION_BATTLE_OPTIONS.systems?.ai?.visuals,
      ...options.systems?.ai?.visuals,
      ...options.ai?.visuals,
    },
  };

  return {
    ui: {
      ...options.ui,
      actionBar,
      targeting,
      attackPreview,
    },
    skills,
    targeting: {
      ...DEFAULT_ACTION_BATTLE_OPTIONS.targeting,
      ...options.targeting,
    },
    attack: normalizedAttack,
    combat: {
      ...combat,
      attack: normalizedAttack,
    },
    ai,
    visual: options.visual,
    animations: {
      ...DEFAULT_ACTION_BATTLE_OPTIONS.animations,
      ...options.animations,
    },
    systems: {
      combat: {
        ...combat,
        attack: normalizedAttack,
      },
      ai,
    },
  };
}

export function setActionBattleOptions(options: ActionBattleOptions) {
  currentActionBattleOptions = options;
}

export function getActionBattleOptions(): ActionBattleOptions {
  return currentActionBattleOptions;
}
