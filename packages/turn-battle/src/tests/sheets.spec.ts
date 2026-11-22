import { describe, expect, it } from "vitest";
import { battlerAnims, readTexture, TICK_MS, type BattleSpritesheet } from "../client/sheets";

/** A hand-written RPGJS spritesheet, as a game would register it. */
const slime: BattleSpritesheet = {
  id: "slime",
  image: "/slime.png",
  framesWidth: 4,
  framesHeight: 3,
  textures: {
    stand: { animations: () => [[{ time: 0, frameX: 0, frameY: 0 }, { time: 12, frameX: 1, frameY: 0 }, { time: 24 }]] },
    bounce: {
      animations: [[
        { time: 0, frameX: 0, frameY: 1 },
        { time: 6, frameX: 1, frameY: 1 },
        { time: 9, frameX: 2, frameY: 1 },
        { time: 18, frameX: 3, frameY: 1 },
      ]],
    },
    // Direction-aware texture (like RPGJS walking sheets): the battle reads the first sequence.
    melt: { animations: (o) => [[{ time: 0, frameX: o?.direction === "right" ? 3 : 2, frameY: 2 }, { time: 30 }]] },
  },
  battle: { anims: { idle: "stand", attack: "bounce", dead: "melt" }, impact: { attack: 2 }, facing: "right" },
};

describe("RPGJS spritesheets as battlers", () => {
  it("reads frames and durations from the texture times (60 fps ticks)", () => {
    const { frames, durations } = readTexture(slime.textures.stand.animations);
    expect(frames).toEqual([{ x: 0, y: 0 }, { x: 1, y: 0 }]);
    expect(durations).toEqual([12 * TICK_MS, 12 * TICK_MS]);
    // Without an end marker, the last frame lasts like the previous one.
    expect(readTexture(slime.textures.bounce.animations).durations).toEqual([6, 3, 9, 9].map((t) => t * TICK_MS));
  });

  it("maps battle animations to textures, with impact frames, loops and facing", () => {
    const anims = battlerAnims(slime, slime.battle);
    expect(anims.get("idle")).toMatchObject({ loop: true, frames: [{ x: 0, y: 0 }, { x: 1, y: 0 }] });
    expect(anims.get("attack")).toMatchObject({ loop: false, impact: 2 });
    expect(anims.get("dead")!.frames).toEqual([{ x: 3, y: 2 }]); // facing right
    expect(anims.has("bounce")).toBe(true); // textures keep their own name too
    // Without hints: every texture is an animation, impact around 45 %.
    const bare = battlerAnims({ ...slime, battle: undefined });
    expect([...bare.keys()]).toEqual(["stand", "bounce", "melt"]);
    expect(bare.get("bounce")!.impact).toBe(1);
  });
});
