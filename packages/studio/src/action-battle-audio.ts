import type {
  ActionBattleAudioOptions,
  ActionBattleOptions,
  ActionBattleVisualContext,
} from "@rpgjs/action-battle";
import { createStudioActionBattleAnimations } from "./action-battle-animations";

export interface StudioCombatAudioConfig {
  battleMusic?: string;
  attack?: string | string[];
  skill?: string | string[];
  hit?: string | string[];
  hurt?: string | string[];
  die?: string | string[];
  fadeInMs?: number;
  fadeOutMs?: number;
  exitDelayMs?: number;
}

const resolveConfig = (
  context: ActionBattleVisualContext,
  fallback: StudioCombatAudioConfig,
): StudioCombatAudioConfig => {
  const runtime = (context as any).engine?.globalConfig?.combatAudio;
  const entity =
    (context.entity as any)?.studioCombatAudio ??
    (context.attacker as any)?.studioCombatAudio;
  return {
    ...fallback,
    ...(runtime && typeof runtime === "object" ? runtime : {}),
    ...(entity && typeof entity === "object" ? entity : {}),
  };
};

const cue = (
  key: "attack" | "skill" | "hit" | "hurt" | "die",
  fallback: StudioCombatAudioConfig,
) => (context: ActionBattleVisualContext) => resolveConfig(context, fallback)[key];

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
    battle: (context) => resolveConfig(context, config).battleMusic,
    volume: 0.8,
    fadeInMs: config.fadeInMs ?? 600,
    fadeOutMs: config.fadeOutMs ?? 900,
    exitDelayMs: config.exitDelayMs ?? 1500,
    mapVolume: 0,
  },
});

/** Studio-ready Action Battle presentation options for client and server. */
export const createStudioActionBattlePreset = (
  config: StudioCombatAudioConfig = {},
): Pick<ActionBattleOptions, "animations" | "audio"> => ({
  animations: createStudioActionBattleAnimations(),
  audio: createStudioActionBattleAudio(config),
});
