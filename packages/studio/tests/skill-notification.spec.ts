import { describe, expect, test } from "vitest";
import { getStudioSkillChangeNotification } from "../src/skill-notification";

const t = (key: string, params?: Record<string, unknown>) => `${key}:${params?.name}`;

describe("Studio skill change notification", () => {
  test("returns a notification for learned skills", () => {
    expect(
      getStudioSkillChangeNotification({
        action: "learn",
        skill: { name: "Fire" },
        skillId: "fire",
      }, t),
    ).toEqual({
      message: "rpg.notification.skill-learned:Fire",
      type: "info",
    });
  });

  test("returns a warning notification for forgotten skills", () => {
    expect(
      getStudioSkillChangeNotification({
        action: "forget",
        skillId: "fire",
      }, t),
    ).toEqual({
      message: "rpg.notification.skill-forgotten:fire",
      type: "warn",
    });
  });
});
