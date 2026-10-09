import { describe, expect, test, vi } from "vitest";
import {
  acquireActionBattleControl,
  hasActionBattleControl,
  releaseActionBattleControls,
} from "./control-state";

describe("action battle control leases", () => {
  test("does not restore an older snapshot over a newer lease", () => {
    const entity = {
      canMove: true,
      directionFixed: false,
      animationFixed: false,
    };
    const attack = acquireActionBattleControl(entity, {
      owner: "attack",
      movement: true,
      direction: true,
    });
    const hurt = acquireActionBattleControl(entity, {
      owner: "hurt",
      animation: true,
    });

    attack.release();

    expect(entity).toEqual({
      canMove: true,
      directionFixed: false,
      animationFixed: true,
    });

    hurt.release();
    expect(entity).toEqual({
      canMove: true,
      directionFixed: false,
      animationFixed: false,
    });
  });

  test("releases timed leases idempotently", () => {
    vi.useFakeTimers();
    const entity = {
      canMove: true,
      directionFixed: false,
      animationFixed: false,
    };
    const lease = acquireActionBattleControl(entity, {
      owner: "attack",
      movement: true,
      durationMs: 120,
    });

    expect(entity.canMove).toBe(false);
    vi.advanceTimersByTime(120);
    expect(entity.canMove).toBe(true);
    lease.release();
    expect(entity.canMove).toBe(true);
    vi.useRealTimers();
  });

  test("can release only one owner", () => {
    const entity = {
      canMove: true,
      directionFixed: false,
      animationFixed: false,
    };
    acquireActionBattleControl(entity, {
      owner: "attack",
      movement: true,
    });
    acquireActionBattleControl(entity, {
      owner: "guard",
      direction: true,
    });

    releaseActionBattleControls(entity, "attack");

    expect(hasActionBattleControl(entity, "attack")).toBe(false);
    expect(hasActionBattleControl(entity, "guard")).toBe(true);
    expect(entity.canMove).toBe(true);
    expect(entity.directionFixed).toBe(true);

    releaseActionBattleControls(entity);
  });
});
