import { describe, expect, test } from "vitest";
import { collectStudioActionBattleMediaRefs } from "../src/action-battle-animation-preload";

describe("Studio Action Battle animation preload", () => {
  test("collects combat, skill impact, and projectile media without duplicates", () => {
    const shared = { _id: "shared-animation" };

    expect(
      collectStudioActionBattleMediaRefs([
        {
          animations: {
            attack: shared,
            castSpell: "cast-animation",
          },
        },
        {
          animation: "impact-animation",
          action: {
            projectile: {
              graphic: "projectile-animation",
            },
          },
        },
        {
          animation: shared,
          actionBattle: {
            projectile: {
              graphic: "",
            },
          },
        },
      ]),
    ).toEqual([
      shared,
      "cast-animation",
      "impact-animation",
      "projectile-animation",
    ]);
  });
});
