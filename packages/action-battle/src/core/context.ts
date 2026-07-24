import type { ActionBattleOptions } from "../types";
import { defaultActionBattleSystems } from "./defaults";
import type { ActionBattleSystems } from "./contracts";

const mergeSystems = (options: ActionBattleOptions = {}): ActionBattleSystems => ({
  combat: {
    ...defaultActionBattleSystems.combat,
    resolveDamage:
      options.combat?.damage ??
      options.systems?.combat?.damage ??
      defaultActionBattleSystems.combat.resolveDamage,
    resolveKnockback:
      options.combat?.knockback ??
      options.systems?.combat?.knockback ??
      defaultActionBattleSystems.combat.resolveKnockback,
    hooks: {
      ...defaultActionBattleSystems.combat.hooks,
      ...options.systems?.combat?.hooks,
      ...options.combat?.hooks,
    },
  },
  ai: {
    actions: {
      ...defaultActionBattleSystems.ai.actions,
      ...options.systems?.ai?.actions,
      ...options.ai?.actions,
    },
    behaviors: {
      ...defaultActionBattleSystems.ai.behaviors,
      ...options.systems?.ai?.behaviors,
      ...options.ai?.behaviors,
    },
    presets: {
      ...defaultActionBattleSystems.ai.presets,
      ...options.systems?.ai?.presets,
      ...options.ai?.presets,
    },
  },
});

let currentActionBattleSystems = mergeSystems();

export const setActionBattleSystems = (options: ActionBattleOptions = {}) => {
  currentActionBattleSystems = mergeSystems(options);
};

export const getActionBattleSystems = () => currentActionBattleSystems;

export const createActionBattleSystems = mergeSystems;
