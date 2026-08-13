import { beforeEach, describe, expect, test, vi } from "vitest";
import {
  createSpriteSheetObject,
  resolveSpritesheet,
  STUDIO_DEFAULT_ATTACK_ANIMATION_DURATION_MS,
  STUDIO_DEFAULT_CHARACTER_DISPLAY_SCALE,
} from "../src/spritesheet-utils";

const { getMedia } = vi.hoisted(() => ({
  getMedia: vi.fn(),
}));

vi.mock("../src/data-provider", () => ({
  getGameDataProvider: () => ({
    getMedia,
  }),
}));

describe("Studio spritesheet utils", () => {
  beforeEach(() => {
    getMedia.mockReset();
  });

  test("adds Studio default display scale without changing spritesheet transform scale", async () => {
    const spritesheet = await createSpriteSheetObject({
      type: "character",
      id: "hero",
      fileName: "hero.png",
      metadata: {
        frameWidth: 4,
        frameHeight: 4,
      },
    });

    expect(spritesheet.scale).toEqual([1, 1]);
    expect(spritesheet.anchor).toBeUndefined();
    expect(spritesheet.displayScale).toBe(STUDIO_DEFAULT_CHARACTER_DISPLAY_SCALE);
    expect(spritesheet.trimTransparentBounds).toBeUndefined();
  });

  test("keeps explicit Studio media scale", async () => {
    const spritesheet = await createSpriteSheetObject({
      type: "character",
      id: "hero",
      fileName: "hero.png",
      metadata: {
        frameWidth: 4,
        frameHeight: 4,
        scale: 0.75,
      },
    });

    expect(spritesheet.scale).toEqual([1, 1]);
    expect(spritesheet.anchor).toBeUndefined();
    expect(spritesheet.displayScale).toBe(STUDIO_DEFAULT_CHARACTER_DISPLAY_SCALE * 0.75);
    expect(spritesheet.trimTransparentBounds).toBeUndefined();
  });

  test("enables visible-frame bounds for generated four-direction spritesheets", async () => {
    const spritesheet = await createSpriteSheetObject({
      type: "spritesheet",
      id: "generated-enemy",
      fileName: "enemy.png",
      metadata: {
        frameWidth: 4,
        frameHeight: 4,
        fourDirections: true,
      },
    });

    expect(spritesheet.trimTransparentBounds).toBe(true);
  });

  test("plays attacks in 350ms without accelerating locomotion", async () => {
    const spritesheet = await createSpriteSheetObject({
      type: "spritesheet",
      id: "generated-attack",
      fileName: "attack.png",
      metadata: {
        frameWidth: 4,
        frameHeight: 4,
        fourDirections: true,
      },
    });

    const params = { direction: "down" };
    const attack = spritesheet.textures.attack.animations(params)[0];
    const walk = spritesheet.textures.walk.animations(params)[0];
    const attackDurationMs =
      (attack.at(-1).time / 60) * 1_000;

    expect(attackDurationMs).toBe(
      STUDIO_DEFAULT_ATTACK_ANIMATION_DURATION_MS,
    );
    expect(walk.at(-1).time).toBe(41);
  });

  test("accepts a Studio media attack duration override", async () => {
    const spritesheet = await createSpriteSheetObject({
      type: "spritesheet",
      id: "generated-heavy-attack",
      fileName: "heavy-attack.png",
      metadata: {
        frameWidth: 4,
        frameHeight: 4,
        attackDurationMs: 600,
      },
    });

    const attack = spritesheet.textures.attack.animations({
      direction: "down",
    })[0];

    expect((attack.at(-1).time / 60) * 1_000).toBeCloseTo(600);
  });

  test("provides the default animation expected by UI icon sprites", async () => {
    const spritesheet = await createSpriteSheetObject({
      type: "icon",
      id: "fire",
      fileName: "fire.png",
      width: 32,
      height: 32,
    });

    expect(spritesheet.textures.default.animations()).toEqual([
      [{ time: 0, frameX: 0, frameY: 0 }],
    ]);
    expect(spritesheet.textures.stand).toBeDefined();
  });

  test("uses the neutral face as the default faceset expression", async () => {
    const spritesheet = await createSpriteSheetObject({
      type: "faceset",
      id: "hero-face",
      fileName: "hero-face.png",
    });

    expect(spritesheet.textures.default.animations()).toEqual(
      spritesheet.textures.neutral.animations(),
    );
  });

  test("keeps LPC sprite real size in source pixels when media is scaled", async () => {
    const spritesheet = await createSpriteSheetObject({
      type: "character",
      id: "hero",
      fileName: "hero.png",
      metadata: {
        lpc: true,
        scale: 0.65,
      },
    });

    expect(spritesheet.scale).toEqual([1, 1]);
    expect(spritesheet.displayScale).toBe(STUDIO_DEFAULT_CHARACTER_DISPLAY_SCALE * 0.65);
    expect(spritesheet.spriteRealSize).toEqual({ width: 48, height: 52 });
  });

  test("tries Studio media lookup for file-name graphics before direct asset fallback", async () => {
    getMedia.mockResolvedValue({
      type: "spritesheet",
      id: "media-hero",
      fileName: "hero.png",
      metadata: {
        frameWidth: 3,
        frameHeight: 4,
        scale: 0.5,
      },
    });

    const spritesheet = await resolveSpritesheet("hero.png");

    expect(getMedia).toHaveBeenCalledWith("hero.png");
    expect(spritesheet.framesWidth).toBe(3);
    expect(spritesheet.scale).toEqual([1, 1]);
    expect(spritesheet.displayScale).toBe(STUDIO_DEFAULT_CHARACTER_DISPLAY_SCALE * 0.5);
  });

  test("keeps direct file-name fallback when Studio media lookup fails", async () => {
    getMedia.mockRejectedValue(new Error("not found"));

    const spritesheet = await resolveSpritesheet("hero.png");

    expect(getMedia).toHaveBeenCalledWith("hero.png");
    expect(spritesheet.framesWidth).toBe(4);
    expect(spritesheet.displayScale).toBe(STUDIO_DEFAULT_CHARACTER_DISPLAY_SCALE);
  });

  test("exposes Studio icons with the default animation expected by GUI components", async () => {
    const spritesheet = await createSpriteSheetObject({
      type: "icon",
      id: "fire-icon",
      fileName: "fire.png",
      width: 32,
      height: 32,
    });

    expect(spritesheet.textures.default).toBeDefined();
    expect(spritesheet.textures.default).toBe(spritesheet.textures.stand);
  });
});
