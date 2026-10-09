import { describe, expect, test } from "vitest";
import { RpgPlayer } from "../src";

describe("player synchronized properties", () => {
  test("uses the configured default value on first registration", () => {
    const player = new RpgPlayer() as RpgPlayer & {
      selectedActorId: (() => string | null) & { set(value: string | null): void };
    };

    player.setSync({
      selectedActorId: {
        $default: "hero",
        $syncWithClient: false,
        $permanent: true,
      },
    });

    expect(player.selectedActorId()).toBe("hero");
  });

  test("preserves an existing permanent value when the schema is reapplied", () => {
    const player = new RpgPlayer() as RpgPlayer & {
      selectedActorId: (() => string | null) & { set(value: string | null): void };
    };
    const schema = {
      selectedActorId: {
        $default: null,
        $syncWithClient: false,
        $permanent: true,
      },
    } as const;

    player.setSync(schema);
    player.selectedActorId.set("luna");
    const property = player.selectedActorId;

    player.setSync(schema);

    expect(player.selectedActorId).toBe(property);
    expect(player.selectedActorId()).toBe("luna");
    expect(player.snapshot().selectedActorId).toBe("luna");
  });
});
