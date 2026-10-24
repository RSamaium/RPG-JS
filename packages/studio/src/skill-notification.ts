type Translate = (key: string, params?: Record<string, unknown>) => string;

const getSkillDisplayName = (payload: any, t: Translate): string => {
  const skill = payload?.skill;
  const name =
    typeof skill?.name === "function"
      ? skill.name()
      : skill?.name ?? payload?.skillId;
  return typeof name === "string" && name.trim() ? name : t("rpg.notification.skill-unknown");
};

export const getStudioSkillChangeNotification = (payload: any, t: Translate) =>
  ({
    message: t(
      payload?.action === "forget"
        ? "rpg.notification.skill-forgotten"
        : "rpg.notification.skill-learned",
      { name: getSkillDisplayName(payload, t) },
    ),
    type: payload?.action === "forget" ? "warn" : "info",
  }) as const;
