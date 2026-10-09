import { describe, expect, test } from "vitest";
import { computed, signal } from "canvasengine";
import { applySyncedParamPayload } from "./syncParams";

describe("applySyncedParamPayload", () => {
  test("notifies computed HUD values when parameters arrive after the player", () => {
    const params = signal<Record<string, unknown>>({});
    const sceneMap = {
      players: () => ({
        player1: { _param: params },
      }),
    };
    const maxHp = computed(() => params().maxHp);
    const maxSp = computed(() => params().maxSp);

    expect(maxHp()).toBeUndefined();
    expect(maxSp()).toBeUndefined();

    applySyncedParamPayload(sceneMap, {
      players: {
        player1: {
          _param: { maxHp: 741, maxSp: 534 },
        },
      },
    });

    expect(maxHp()).toBe(741);
    expect(maxSp()).toBe(534);
  });

  test("merges partial parameter updates without dropping existing values", () => {
    const params = signal<Record<string, unknown>>({ maxHp: 741, maxSp: 534 });
    const sceneMap = {
      players: () => ({
        player1: { _param: params },
      }),
    };

    applySyncedParamPayload(sceneMap, {
      players: {
        player1: {
          _param: { maxHp: 800 },
        },
      },
    });

    expect(params()).toEqual({ maxHp: 800, maxSp: 534 });
  });
});
