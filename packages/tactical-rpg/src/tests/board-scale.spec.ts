import { describe, it, expect, vi, afterEach } from "vitest";
vi.mock("@rpgjs/server", () => ({ defineModule: (value: unknown) => value }));
vi.mock("@rpgjs/common", () => ({ createModule: (_name: string, value: unknown) => value }));
import { provideTacticalServer, startTacticalBattle, tacticalEncounter, tacticalUnit } from "../server";
import type { BattlePacket } from "../core/types";

afterEach(() => vi.useRealTimers());

const database: Record<string, unknown> = {
  wolf: tacticalUnit({ name: "Wolf", tactical: { role: "warrior", battler: "wolf", stats: { hp: 40, sp: 0, power: 8, range: 1, move: 3 } } }),
  den: tacticalEncounter({ name: "Den", tactical: { allies: [{ hero: true, x: 4, y: 5 }], enemies: [{ unit: "wolf", x: 4, y: 1 }] } }),
  "big-den": tacticalEncounter({
    name: "Big den",
    tactical: { board: { cellSize: 64 }, allies: [{ hero: true, x: 4, y: 5 }], enemies: [{ unit: "wolf", x: 4, y: 1 }] },
  }),
};

let count = 0;
/** A player standing at (300, 300) on a map of 32 px tiles (or on no map). */
function player(map: { tileWidth: number } | null) {
  const packets: BattlePacket[] = [];
  const gui = {
    open: vi.fn((data: BattlePacket) => {
      packets.push(data);
      return new Promise(() => {});
    }),
    update: (data: BattlePacket) => packets.push(data),
    on: () => {},
    close: vi.fn(),
  };
  const p = {
    id: `scale-player-${++count}`,
    name: "Aria",
    param: { maxHp: 0, maxSp: 0 },
    graphics: ["aria"],
    x: 300,
    y: 300,
    setGraphic: vi.fn(),
    skills: () => [],
    items: () => [],
    equipments: () => [],
    getCurrentMap: () => map,
    databaseById: (id: string) => {
      if (!database[id]) throw new Error("not found");
      return database[id];
    },
    gui: () => gui,
  };
  return { p, packets };
}

async function boardOf(map: { tileWidth: number } | null, encounter: string) {
  vi.useFakeTimers();
  provideTacticalServer();
  const { p, packets } = player(map);
  void startTacticalBattle(p as never, encounter);
  await vi.advanceTimersByTimeAsync(0);
  return packets.at(-1)!.state.board;
}

describe("the size of the tactical grid", () => {
  it("takes the tile of the map, so the battle is drawn at the scale of the map", async () => {
    const board = await boardOf({ tileWidth: 32 }, "den");
    expect(board.cellSize).toBe(32);
  });

  it("puts its cells on the tiles of the map, the player's tile in the middle", async () => {
    const board = await boardOf({ tileWidth: 32 }, "den");
    // The player's tile starts at (288, 288); a 9 × 7 grid has 4 columns left of it and 3 rows above.
    expect(board.origin).toEqual({ x: 288 - 4 * 32, y: 288 - 3 * 32 });
  });

  it("keeps the cell size the encounter gives", async () => {
    const board = await boardOf({ tileWidth: 32 }, "big-den");
    expect(board.cellSize).toBe(64);
    expect(board.origin.x % 32).toBe(0);
  });

  it("uses 64 px cells when the map is unknown", async () => {
    const board = await boardOf(null, "den");
    expect(board.cellSize).toBe(64);
  });
});
