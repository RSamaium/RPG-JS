import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { testing, type TestingFixture } from "@rpgjs/testing";
import { createModule, defineModule } from "@rpgjs/common";
import type { RpgEvent, RpgPlayer } from "@rpgjs/server";
import { AiState } from "./ai.server";
import { chase, ifTargetInRange, useAttack } from "./core/ai-behavior-tree";
import { createActionEnemy } from "./enemies/factory";

let fixture: TestingFixture;
let player: RpgPlayer;

beforeEach(async () => {
  const server = defineModule({
    maps: [{ id: "arena", file: "", width: 2048, height: 1536 }],
    player: {
      async onConnected(p: RpgPlayer) {
        await p.changeMap("arena", { x: 400, y: 400 });
      },
    },
  });
  fixture = await testing(createModule("AiReengageTest", [{ server, client: defineModule({}) }]));
  const client = await fixture.createClient();
  player = await client.waitForMapChange("arena");
  player.hp = 500;
});

afterEach(async () => {
  await fixture.clear();
});

// The test map does not tick on its own: drive the AI loop by hand.
const run = async (ai: any, ticks: number) => {
  for (let i = 0; i < ticks; i++) {
    ai.updateAiBehavior();
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
};

describe("enemy driven by a custom behavior", () => {
  test("fights again when its target comes back after leaving", async () => {
    const map = player.getCurrentMap()!;
    const id = await map.createDynamicEvent({
      id: "brute",
      x: 440,
      y: 400,
      event: {
        name: "Brute",
        onInit(this: RpgEvent) {
          createActionEnemy(this, {
            stats: { maxHp: 200, atk: 5 },
            visionRange: 200,
            attackRange: 62,
            simpleBehavior: {
              when: [ifTargetInRange(useAttack(), 66)],
              otherwise: chase(),
            },
          });
        },
      },
    });
    const ai = (map.getEvent(id!) as any).battleAi;
    await run(ai, 10);
    expect([ai.state, ai.target?.id]).toEqual([AiState.Combat, player.id]);

    // The target runs out of sight, then comes back next to the enemy.
    await player.teleport({ x: 1600, y: 1200 });
    ai.onDetectOutShape(player, {});
    await run(ai, 3);
    expect(ai.state).toBe(AiState.Idle);

    const brute = map.getEvent(id!)!;
    await player.teleport({ x: brute.x() + 40, y: brute.y() });
    await run(ai, 80);
    expect([ai.state, ai.target?.id]).toEqual([AiState.Combat, player.id]);
  });
});
