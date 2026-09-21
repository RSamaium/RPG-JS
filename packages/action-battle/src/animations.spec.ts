import { describe, expect, test, vi } from "vitest";
import { playActionBattleAnimation } from "./animations";

describe("action battle animations", () => {
  test("uses setGraphicAnimation when the entity exposes the server animation API", () => {
    const entity = {
      setGraphicAnimation: vi.fn(),
      setAnimation: vi.fn(),
    };

    playActionBattleAnimation("attack", entity);

    expect(entity.setGraphicAnimation).toHaveBeenCalledWith("attack", 1);
    expect(entity.setAnimation).not.toHaveBeenCalled();
  });

  test("falls back to setAnimation for client sprite objects", () => {
    const entity = {
      setAnimation: vi.fn(),
    };

    playActionBattleAnimation("attack", entity, {
      attack: {
        animationName: "slash",
        graphic: "hero-slash",
        repeat: 2,
      },
    });

    expect(entity.setAnimation).toHaveBeenCalledWith(
      "slash",
      "hero-slash",
      2
    );
  });

  test("does not throw when the entity has no animation API", () => {
    expect(() => playActionBattleAnimation("attack", {})).not.toThrow();
  });
});

test.each([undefined, "enemy-attack"])("passes authoritative cycle duration to client animation (%s)", (graphic) => {
  const entity = { setAnimation: vi.fn() };
  playActionBattleAnimation("attack", entity, { attack: { animationName: "slash", graphic } }, undefined, { durationMs: 620 });
  expect(entity.setAnimation).toHaveBeenCalledWith(...(graphic
    ? ["slash", graphic, 1, { durationMs: 620 }]
    : ["slash", 1, { durationMs: 620 }]));
});
