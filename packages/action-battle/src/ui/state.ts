import { signal } from "canvasengine";
import { ActionBattleActionBarSkill, ActionBattleOptions } from "../types";
import { DEFAULT_ACTION_BATTLE_OPTIONS, normalizeActionBattleOptions } from "../config";

export interface ActionBattleAttackPreviewState {
  active: boolean;
  id: number;
  direction: string;
  startedAt: number;
  durationMs: number;
  color: number;
  accentColor: number;
}

export interface ActionBattleTargetingState {
  active: boolean;
  skill: ActionBattleActionBarSkill | null;
  range: number;
  offset: { x: number; y: number };
  aoeMask: string[] | string;
}

const defaultTargetingState: ActionBattleTargetingState = {
  active: false,
  skill: null,
  range: 0,
  offset: { x: 0, y: 0 },
  aoeMask: DEFAULT_ACTION_BATTLE_OPTIONS.skills?.defaultAoeMask || ["#"],
};

const defaultAttackPreviewState: ActionBattleAttackPreviewState = {
  active: false,
  id: 0,
  direction: "down",
  startedAt: 0,
  durationMs: 180,
  color: 0xfff3b0,
  accentColor: 0xffffff,
};

export const actionBattleUiOptions = signal(
  normalizeActionBattleOptions({}).ui || {}
);
export const actionBattleSkillOptions = signal(
  normalizeActionBattleOptions({}).skills || {}
);
export const actionBattleCombatOptions = signal(
  normalizeActionBattleOptions({}).combat || {}
);
export const ACTION_BATTLE_SKILL_LOADOUT_VISUAL_ID =
  "action-battle.skill-loadout";
export const actionBattleSkillLoadout = signal<ActionBattleActionBarSkill[]>([]);

export const actionBattleTargetingState = signal<ActionBattleTargetingState>({
  ...defaultTargetingState,
});
export const actionBattleAttackPreviewState =
  signal<ActionBattleAttackPreviewState>({
    ...defaultAttackPreviewState,
  });
export const setActionBattleOptions = (options: ActionBattleOptions = {}) => {
  const normalized = normalizeActionBattleOptions(options);
  actionBattleUiOptions.set(normalized.ui || {});
  actionBattleSkillOptions.set(normalized.skills || {});
  actionBattleCombatOptions.set(normalized.combat || {});
};

export const setActionBattleSkillLoadout = (
  skills: ActionBattleActionBarSkill[] = []
) => {
  actionBattleSkillLoadout.set(
    Array.isArray(skills)
      ? skills.filter(
          (skill): skill is ActionBattleActionBarSkill =>
            !!skill && typeof skill.id === "string"
        )
      : []
  );
};

export const startTargeting = (skill: ActionBattleActionBarSkill) => {
  const skillsOptions = actionBattleSkillOptions();
  const mask = skill.aoeMask || (skillsOptions.defaultAoeMask as string[]) || ["#"];
  actionBattleTargetingState.set({
    active: true,
    skill,
    range: skill.range ?? 0,
    offset: { x: 0, y: 0 },
    aoeMask: mask,
  });
};

export const stopTargeting = () => {
  actionBattleTargetingState.set({ ...defaultTargetingState });
};

export const moveTargetingOffset = (dx: number, dy: number) => {
  const state = actionBattleTargetingState();
  if (!state.active) return;
  const next = {
    x: state.offset.x + dx,
    y: state.offset.y + dy,
  };
  if (Math.abs(next.x) + Math.abs(next.y) > state.range) {
    return;
  }
  actionBattleTargetingState.set({
    ...state,
    offset: next,
  });
};

export const startAttackPreview = (options: {
  direction: string;
  durationMs?: number;
  color?: number;
  accentColor?: number;
}) => {
  const current = actionBattleAttackPreviewState();
  const id = current.id + 1;
  const durationMs = Math.max(
    1,
    options.durationMs ?? defaultAttackPreviewState.durationMs
  );
  actionBattleAttackPreviewState.set({
    active: true,
    id,
    direction: options.direction,
    startedAt: Date.now(),
    durationMs,
    color: options.color ?? defaultAttackPreviewState.color,
    accentColor: options.accentColor ?? defaultAttackPreviewState.accentColor,
  });
  return id;
};

export const stopAttackPreview = (id?: number) => {
  const current = actionBattleAttackPreviewState();
  if (id !== undefined && current.id !== id) return;
  actionBattleAttackPreviewState.set({
    ...current,
    active: false,
  });
};
