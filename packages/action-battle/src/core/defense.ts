import type { ActionBattleGuardOptions } from "../types";
import { releaseActionBattleControls, acquireActionBattleControl } from "./control-state";

export type ActionBattleDefenseKind = "guard" | "parry";

export interface ActionBattleDefenseResolution {
  kind: ActionBattleDefenseKind;
  damageMultiplier: number;
  knockbackMultiplier: number;
  staggerMs: number;
}

type DefenseEntity = {
  x?: () => number;
  y?: () => number;
  direction?: string | (() => string);
  getDirection?: () => string;
  directionFixed?: boolean;
  animationFixed?: boolean;
};

type DefenseState = {
  guarding: boolean;
  startedAt: number;
  counterUntil: number;
  options: Required<ActionBattleGuardOptions>;
};

const DEFAULT_GUARD_OPTIONS: Required<ActionBattleGuardOptions> = {
  enabled: true,
  control: "f",
  parryWindowMs: 140,
  guardDamageReduction: 0.65,
  guardKnockbackReduction: 0.6,
  guardArcDegrees: 120,
  staggerMs: 650,
  counterWindowMs: 700,
  counterDamageMultiplier: 1.5,
  counterStaggerMultiplier: 1.5,
};

const states = new WeakMap<object, DefenseState>();

export const normalizeActionBattleGuardOptions = (
  options: ActionBattleGuardOptions = {}
): Required<ActionBattleGuardOptions> => ({
  ...DEFAULT_GUARD_OPTIONS,
  ...options,
  parryWindowMs: Math.max(0, options.parryWindowMs ?? 140),
  guardDamageReduction: Math.max(
    0,
    Math.min(1, options.guardDamageReduction ?? 0.65)
  ),
  guardKnockbackReduction: Math.max(
    0,
    Math.min(1, options.guardKnockbackReduction ?? 0.6)
  ),
  guardArcDegrees: Math.max(
    0,
    Math.min(360, options.guardArcDegrees ?? 120)
  ),
  staggerMs: Math.max(0, options.staggerMs ?? 650),
  counterWindowMs: Math.max(0, options.counterWindowMs ?? 700),
  counterDamageMultiplier: Math.max(
    0,
    options.counterDamageMultiplier ?? 1.5
  ),
  counterStaggerMultiplier: Math.max(
    0,
    options.counterStaggerMultiplier ?? 1.5
  ),
});

export const beginActionBattleGuard = (
  entity: DefenseEntity,
  options: ActionBattleGuardOptions = {},
  now = Date.now()
) => {
  const normalized = normalizeActionBattleGuardOptions(options);
  const current = states.get(entity as object);
  states.set(entity as object, {
    guarding: true,
    startedAt: now,
    counterUntil: current?.counterUntil ?? 0,
    options: normalized,
  });
  releaseActionBattleControls(entity, "guard");
  acquireActionBattleControl(entity, {
    owner: "guard",
    direction: true,
    animation: true,
  });
};

export const endActionBattleGuard = (entity: DefenseEntity) => {
  const state = states.get(entity as object);
  if (state) state.guarding = false;
  releaseActionBattleControls(entity, "guard");
};

const readDirection = (entity: DefenseEntity) => {
  if (typeof entity.getDirection === "function") return entity.getDirection();
  if (typeof entity.direction === "function") return entity.direction();
  return entity.direction ?? "down";
};

const directionVector = (direction: string) => {
  if (direction === "up") return { x: 0, y: -1 };
  if (direction === "left") return { x: -1, y: 0 };
  if (direction === "right") return { x: 1, y: 0 };
  return { x: 0, y: 1 };
};

const isAttackerInGuardArc = (
  target: DefenseEntity,
  attacker: DefenseEntity,
  arcDegrees: number
) => {
  if (
    typeof target.x !== "function" ||
    typeof target.y !== "function" ||
    typeof attacker.x !== "function" ||
    typeof attacker.y !== "function"
  ) {
    return true;
  }
  const dx = attacker.x() - target.x();
  const dy = attacker.y() - target.y();
  const distance = Math.hypot(dx, dy);
  if (distance <= 0) return true;
  const facing = directionVector(readDirection(target));
  const dot = Math.max(
    -1,
    Math.min(1, (facing.x * dx + facing.y * dy) / distance)
  );
  const angle = Math.acos(dot) * (180 / Math.PI);
  return angle <= arcDegrees / 2;
};

export const resolveActionBattleDefense = (
  target: DefenseEntity,
  attacker: DefenseEntity,
  now = Date.now()
): ActionBattleDefenseResolution | null => {
  const state = states.get(target as object);
  if (
    !state?.guarding ||
    !isAttackerInGuardArc(target, attacker, state.options.guardArcDegrees)
  ) {
    return null;
  }

  if (now - state.startedAt <= state.options.parryWindowMs) {
    state.guarding = false;
    state.counterUntil = now + state.options.counterWindowMs;
    releaseActionBattleControls(target, "guard");
    return {
      kind: "parry",
      damageMultiplier: 0,
      knockbackMultiplier: 0,
      staggerMs: state.options.staggerMs,
    };
  }

  return {
    kind: "guard",
    damageMultiplier: 1 - state.options.guardDamageReduction,
    knockbackMultiplier: 1 - state.options.guardKnockbackReduction,
    staggerMs: 0,
  };
};

export const consumeActionBattleCounter = (
  entity: DefenseEntity,
  now = Date.now()
) => {
  const state = states.get(entity as object);
  if (!state || state.counterUntil < now) return null;
  state.counterUntil = 0;
  return {
    damageMultiplier: state.options.counterDamageMultiplier,
    staggerMultiplier: state.options.counterStaggerMultiplier,
  };
};

export const isActionBattleGuarding = (entity: DefenseEntity) =>
  states.get(entity as object)?.guarding === true;

export const clearActionBattleDefense = (entity: DefenseEntity) => {
  states.delete(entity as object);
  releaseActionBattleControls(entity, "guard");
};
