import type { ActionBattleHotbarSkill } from "../types";

export type ActionBattleSkillActivationMode = "immediate" | "targeting";

const hasAreaMask = (skill: ActionBattleHotbarSkill) => {
  const rows = Array.isArray(skill.aoeMask) ? skill.aoeMask : [];
  return rows.length > 1 || rows.some((row) => row !== "#");
};

export const resolveActionBattleSkillActivationMode = (
  skill: ActionBattleHotbarSkill,
): ActionBattleSkillActivationMode => {
  if (skill.action?.target === "self") return "immediate";
  if (
    skill.action?.mode === "instant"
    || skill.action?.mode === "projectile"
  ) {
    return "immediate";
  }
  if (skill.action?.target === "ally") return "targeting";
  if (hasAreaMask(skill)) return "targeting";
  if ((skill.range ?? 0) > 0) {
    return "targeting";
  }
  return "immediate";
};

export const actionBattleTargetingOffset = (
  direction: string,
  range: number,
) => {
  if (range <= 0) return { x: 0, y: 0 };
  if (direction === "up") return { x: 0, y: -1 };
  if (direction === "left") return { x: -1, y: 0 };
  if (direction === "right") return { x: 1, y: 0 };
  return { x: 0, y: 1 };
};

export const activateActionBattleSkill = (
  skill: ActionBattleHotbarSkill | null | undefined,
  callbacks: {
    use: () => void;
    target: (initialOffset: { x: number; y: number }) => void;
    direction?: string;
  },
) => {
  if (!skill || !skill.usable) return false;
  if (resolveActionBattleSkillActivationMode(skill) === "targeting") {
    callbacks.target(
      actionBattleTargetingOffset(
        callbacks.direction ?? "down",
        skill.range ?? 0,
      ),
    );
    return true;
  }
  callbacks.use();
  return true;
};
