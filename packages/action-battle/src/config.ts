import { ActionBattleOptions } from "./types";
import { normalizeActionBattleAttackProfile } from "./core/attack-profile";

export const DEFAULT_ACTION_BATTLE_OPTIONS: ActionBattleOptions = {
  preset: "adventure",
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
  combat: {
    player: {
      combo: {
        enabled: true,
        bufferMs: 140,
        resetMs: 700,
        steps: [
          {
            id: "adventure-combo-1",
            startupMs: 55,
            activeMs: 90,
            recoveryMs: 120,
            damageMultiplier: 0.85,
            knockbackMultiplier: 0.7,
          },
          {
            id: "adventure-combo-2",
            startupMs: 45,
            activeMs: 95,
            recoveryMs: 130,
            damageMultiplier: 1,
            knockbackMultiplier: 0.85,
          },
          {
            id: "adventure-combo-3",
            startupMs: 90,
            activeMs: 120,
            recoveryMs: 240,
            damageMultiplier: 1.35,
            knockbackMultiplier: 1.4,
          },
        ],
      },
      chargedAttack: {
        enabled: true,
        control: "e",
        minChargeMs: 300,
        maxChargeMs: 900,
        minDamageMultiplier: 1.5,
        maxDamageMultiplier: 2.4,
        minKnockbackMultiplier: 1.6,
        maxKnockbackMultiplier: 2.3,
        profile: {
          id: "adventure-charged",
          startupMs: 100,
          activeMs: 140,
          recoveryMs: 380,
        },
      },
      dodge: {
        enabled: true,
        durationMs: 180,
        cooldownMs: 650,
        invincibilityMs: 220,
        additionalSpeed: 8,
      },
    },
  },
  visual: "impact",
  animations: {},
};

let currentActionBattleOptions: ActionBattleOptions =
  DEFAULT_ACTION_BATTLE_OPTIONS;

export function normalizeActionBattleOptions(
  options: ActionBattleOptions = {}
): ActionBattleOptions {
  const preset = options.preset ?? DEFAULT_ACTION_BATTLE_OPTIONS.preset;
  const classic = preset === "classic";
  const defaultCombat = classic
    ? { player: { combo: false, chargedAttack: false, dodge: false } }
    : DEFAULT_ACTION_BATTLE_OPTIONS.combat;
  const defaultAdventurePlayer = DEFAULT_ACTION_BATTLE_OPTIONS.combat?.player;
  const requestedPlayer = {
    ...defaultCombat?.player,
    ...options.systems?.combat?.player,
    ...options.combat?.player,
  };
  const normalizePlayerFeature = (
    value: any,
    defaults: any
  ) => {
    if (value === false) return false;
    if (value === true) return { ...defaults, enabled: true };
    if (value && typeof value === "object") {
      return { ...defaults, ...value, enabled: value.enabled ?? true };
    }
    return value;
  };
  const combat = {
    ...defaultCombat,
    ...DEFAULT_ACTION_BATTLE_OPTIONS.systems?.combat,
    ...options.systems?.combat,
    ...options.combat,
    hooks: {
      ...DEFAULT_ACTION_BATTLE_OPTIONS.systems?.combat?.hooks,
      ...options.systems?.combat?.hooks,
      ...options.combat?.hooks,
    },
    player: {
      ...requestedPlayer,
      combo: normalizePlayerFeature(
        requestedPlayer.combo,
        defaultAdventurePlayer?.combo
      ),
      chargedAttack: normalizePlayerFeature(
        requestedPlayer.chargedAttack,
        defaultAdventurePlayer?.chargedAttack
      ),
      dodge: normalizePlayerFeature(
        requestedPlayer.dodge,
        defaultAdventurePlayer?.dodge
      ),
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
    preset,
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
    visual: options.visual ?? (classic ? "classic" : DEFAULT_ACTION_BATTLE_OPTIONS.visual),
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
