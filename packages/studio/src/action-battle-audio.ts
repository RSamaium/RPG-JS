import type {
  ActionBattleAudioOptions,
  ActionBattleOptions,
  ActionBattleVisualContext,
} from "@rpgjs/action-battle";
import type { RpgPlayer } from "@rpgjs/server";
import { createStudioActionBattleAnimations } from "./action-battle-animations";

export type StudioHotbarContent = "skills" | "items" | "mixed";

/** Runtime hotbar settings resolved from a Studio GUI binding. */
export interface StudioHotbarSettings {
  /** Whether the hotbar is shown automatically. */
  enabled: boolean;
  /** Database record types available in the hotbar. */
  content: StudioHotbarContent;
  /** Exact number of visible slots, from 1 to 10. */
  slotCount: number;
}

/** Project- or map-level binding between the hotbar role and a Studio GUI. */
export interface StudioHotbarBinding {
  /** Whether this binding is active. */
  enabled: boolean;
  /** Future project GUI definition. `null` selects the native RPGJS GUI. */
  guiId?: string | null;
  /** Settings understood by the selected hotbar GUI. */
  settings: Omit<StudioHotbarSettings, "enabled">;
}

/** Project-level binding between a built-in GUI role and its renderer. */
export interface StudioGuiBinding {
  /** Whether the GUI is available or displayed by its native lifecycle. */
  enabled: boolean;
  /** Future project GUI definition. `null` selects the native RPGJS GUI. */
  guiId?: string | null;
}

/** Settings owned by the native title-screen GUI. */
export interface StudioTitleScreenSettings {
  /** Looping background music played while the title screen is visible. */
  backgroundMusic?: string | null;
  /** Image displayed behind the native title-screen content. */
  backgroundImage?: string | null;
}

/** Project-level binding for the native title-screen GUI. */
export interface StudioTitleScreenBinding extends StudioGuiBinding {
  settings: StudioTitleScreenSettings;
}

/** Character selection settings persisted by RPGJS Studio. */
export interface StudioCharacterSelectSettings {
  /** Whether character select is shown for a new game. */
  enabled: boolean;
  /** Whether every Actor record is offered. */
  allActors: boolean;
  /** Studio Actor document IDs offered when `allActors` is false. */
  actorIds: string[];
}

/** Project-level binding for the native character selection GUI. */
export interface StudioCharacterSelectBinding extends StudioGuiBinding {
  settings: Omit<StudioCharacterSelectSettings, "enabled">;
}

/** GUI bindings persisted by RPGJS Studio. */
export interface StudioMenusSettings {
  /** Title Screen binding. Disabled projects enter their starting map directly. */
  titleScreen?: StudioTitleScreenBinding;
  /** Character selection shown only when starting a new game. */
  characterSelect?: StudioCharacterSelectBinding;
  /** Hotbar binding and its role-specific settings. */
  hotbar?: StudioHotbarBinding;
  /** Persistent player status HUD binding. */
  hud?: StudioGuiBinding;
  /** Main Menu binding opened by the logical Back action. */
  mainMenu?: StudioGuiBinding;
}

const DEFAULT_STUDIO_CHARACTER_SELECT: StudioCharacterSelectSettings = {
  enabled: false,
  allActors: true,
  actorIds: [],
};

/** Normalize untrusted Studio character selection settings. */
export const normalizeStudioCharacterSelectSettings = (
  value: unknown,
): StudioCharacterSelectSettings => {
  if (!value || typeof value !== "object") {
    return { ...DEFAULT_STUDIO_CHARACTER_SELECT };
  }
  const input = value as Partial<StudioCharacterSelectBinding>
    & Partial<StudioCharacterSelectSettings>;
  const settings = input.settings && typeof input.settings === "object"
    ? input.settings
    : input;
  const actorIds = Array.isArray(settings.actorIds)
    ? Array.from(new Set(settings.actorIds.filter(
        (id): id is string => typeof id === "string" && id.trim().length > 0,
      )))
    : [];
  return {
    enabled: input.enabled === true,
    allActors: settings.allActors !== false,
    actorIds,
  };
};

const DEFAULT_STUDIO_HOTBAR: StudioHotbarSettings = {
  enabled: false,
  content: "skills",
  slotCount: 10,
};

/**
 * Normalize project hotbar data received from RPGJS Studio.
 *
 * @param value - Untrusted Studio hotbar configuration.
 * @returns A complete runtime configuration with backward-compatible defaults.
 */
export const normalizeStudioHotbarSettings = (
  value: unknown,
): StudioHotbarSettings => {
  if (!value || typeof value !== "object") return { ...DEFAULT_STUDIO_HOTBAR };
  const input = value as Partial<StudioHotbarBinding>
    & Partial<StudioHotbarSettings>;
  const settings = input.settings && typeof input.settings === "object"
    ? input.settings
    : input;
  const content = settings.content === "items" || settings.content === "mixed"
    ? settings.content
    : "skills";
  const requestedSlots = Math.floor(Number(settings.slotCount));
  return {
    enabled: input.enabled === true,
    content,
    slotCount: Number.isFinite(requestedSlots)
      ? Math.max(1, Math.min(10, requestedSlots))
      : DEFAULT_STUDIO_HOTBAR.slotCount,
  };
};

/**
 * Resolve the effective hotbar settings for a player.
 *
 * @param player - Player whose current Studio map provides the settings.
 * @returns The normalized effective hotbar configuration.
 */
export const resolveStudioHotbarSettings = (
  player: RpgPlayer,
): StudioHotbarSettings => {
  const map = player.getCurrentMap?.() as {
    globalConfig?: { menus?: StudioMenusSettings };
  } | undefined;
  return normalizeStudioHotbarSettings(
    map?.globalConfig?.menus?.hotbar,
  );
};

const studioHotbarEntryTypes = (player: RpgPlayer): readonly string[] => {
  const content = resolveStudioHotbarSettings(player).content;
  if (content === "items") return ["item"];
  if (content === "mixed") return ["skill", "item"];
  return ["skill"];
};

export interface StudioCombatAudioConfig {
  battleMusic?: string;
  attack?: string | string[];
  skill?: string | string[];
  hit?: string | string[];
  hurt?: string | string[];
  die?: string | string[];
}

const DEFAULT_STUDIO_COMBAT_AUDIO: StudioCombatAudioConfig = {
  attack: "rpgjs-combat-attack",
  skill: "rpgjs-combat-cast",
  hit: "rpgjs-combat-hit",
  hurt: "rpgjs-combat-hurt",
  die: "rpgjs-combat-die",
};

const compactStudioCombatAudio = (
  value: unknown,
): StudioCombatAudioConfig => {
  if (!value || typeof value !== "object") return {};
  const input = value as StudioCombatAudioConfig;
  const compact: StudioCombatAudioConfig = {};
  const battleMusic = input.battleMusic?.trim();
  if (battleMusic) compact.battleMusic = battleMusic;
  (["attack", "skill", "hit", "hurt", "die"] as const).forEach((key) => {
    const cue = input[key];
    if (typeof cue === "string") {
      const id = cue.trim();
      if (id) compact[key] = id;
      return;
    }
    if (Array.isArray(cue)) {
      const ids = cue.map((id) => id.trim()).filter(Boolean);
      if (ids.length > 0) compact[key] = ids;
    }
  });
  return compact;
};

const resolveConfig = (
  context: ActionBattleVisualContext,
  fallback: StudioCombatAudioConfig,
  key: "attack" | "skill" | "hit" | "hurt" | "die",
): StudioCombatAudioConfig => {
  const engine = (context as any).engine;
  const runtime = engine?.globalConfig?.combatAudio ?? engine?.globalConfig?.audio?.combat;
  const source = context.entity ?? context.attacker;
  const target = context.target ?? context.entity;
  const sourceAudio = (context as any).sourceAudio
    ?? (source as any)?.audio?.combat
    ?? (source as any)?.studioCombatAudio;
  const targetAudio = (context as any).targetAudio
    ?? (target as any)?.audio?.combat
    ?? (target as any)?.studioCombatAudio;
  const entity = key === "hurt" || key === "die" ? targetAudio : sourceAudio;
  return {
    ...DEFAULT_STUDIO_COMBAT_AUDIO,
    ...compactStudioCombatAudio(fallback),
    ...compactStudioCombatAudio(runtime),
    ...compactStudioCombatAudio(entity),
  };
};

const cue = (
  key: "attack" | "skill" | "hit" | "hurt" | "die",
  fallback: StudioCombatAudioConfig,
) => (context: ActionBattleVisualContext) => {
  const config = resolveConfig(context, fallback, key);
  return config[key];
};

/**
 * Maps Studio project combat-audio settings to Action Battle. Skill-specific
 * sounds still take precedence over the generic `skill` cue.
 */
export const createStudioActionBattleAudio = (
  config: StudioCombatAudioConfig = {},
): ActionBattleAudioOptions => ({
  attack: cue("attack", config),
  skill: cue("skill", config),
  hit: cue("hit", config),
  hurt: cue("hurt", config),
  die: cue("die", config),
  music: {
    battle: (context) => {
      const resolved = resolveConfig(context, config, "attack");
      return resolved.battleMusic;
    },
    volume: 0.8,
    fadeInMs: 600,
    fadeOutMs: 900,
    exitDelayMs: 1500,
    mapVolume: 0,
  },
});

/**
 * Create the Studio-ready Action Battle presentation preset.
 *
 * The server resolves hotbar visibility, content, and capacity from the
 * player's current Studio project/map configuration. The client safely ignores
 * those server-only resolvers while sharing animation and audio presentation.
 *
 * @param config - Optional fallback combat audio settings.
 * @returns Action Battle animation, audio, and dynamic hotbar options.
 */
export const createStudioActionBattlePreset = (
  config: StudioCombatAudioConfig = {},
): Pick<ActionBattleOptions, "animations" | "audio" | "ui"> => ({
  animations: createStudioActionBattleAnimations(),
  audio: createStudioActionBattleAudio(config),
  ui: {
    hotbar: {
      enabled: (player) => resolveStudioHotbarSettings(player).enabled,
      autoOpen: true,
      capacity: (player) => resolveStudioHotbarSettings(player).slotCount,
      allowedEntryTypes: studioHotbarEntryTypes,
    },
  },
});
