import { describe, expect, test, vi } from "vitest";
import { createActionEnemy, defineActionBattleEnemy } from "./factory";

const createEvent = () => ({
  id: "slime-1",
  hp: 0,
  sp: 0,
  param: {} as Record<string, number>,
  setGraphic: vi.fn(),
  attachShape: vi.fn(),
  mergeComponents: vi.fn(),
  componentsTop: vi.fn(() => null),
  getCurrentMap: vi.fn(() => ({})),
  x: vi.fn(() => 0),
  y: vi.fn(() => 0),
});

describe("createActionEnemy", () => {
  test("applies the graphic and declarative stats, then attaches the AI", () => {
    const Slime = defineActionBattleEnemy({
      graphic: "slime",
      stats: { maxHp: 120, maxSp: 20, atk: 10, pdef: 4 },
      rewards: { exp: 5 },
    });
    const event = createEvent();

    const ai = createActionEnemy(event as any, Slime);

    expect(event.setGraphic).toHaveBeenCalledWith("slime");
    expect(event.param).toMatchObject({ maxHp: 120, maxSp: 20, atk: 10, pdef: 4 });
    expect(event.hp).toBe(120);
    expect(event.sp).toBe(20);
    expect((event as any).battleAi).toBe(ai);
    ai.destroy();
  });

  test("keeps the function form and named presets", () => {
    const stats = vi.fn();
    const event = createEvent();
    const ai = createActionEnemy(event as any, "boss", { boss: { stats } });
    expect(stats).toHaveBeenCalledWith(event);
    expect(() => createActionEnemy(event as any, "missing")).toThrow(/missing/);
    ai.destroy();
  });
});
