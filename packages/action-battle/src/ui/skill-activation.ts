import type { ActionBattleActionBarSkill } from "../types";

export type ActionBattleSkillActivationMode = "immediate" | "targeting";

const hasAreaMask = (skill: ActionBattleActionBarSkill) => {
  const rows = Array.isArray(skill.aoeMask) ? skill.aoeMask : [];
  return rows.length > 1 || rows.some((row) => row !== "#");
};

export const resolveActionBattleSkillActivationMode = (
  skill: ActionBattleActionBarSkill,
): ActionBattleSkillActivationMode => {
  if (skill.action?.target === "self") return "immediate";
  if (skill.action?.target === "ally") return "targeting";
  if (hasAreaMask(skill)) return "targeting";
  if ((skill.range ?? 0) > 0 && skill.action?.mode !== "projectile") {
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
  skill: ActionBattleActionBarSkill | null | undefined,
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
