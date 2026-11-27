/**
 * Two players play a tactical battle as they would in the game: a real battle on the server, and for each player
 * their own client (the state of their HUD), fed with the packets of their GUI and sending their orders back. The
 * players play with the commands of the keyboard (`nextUnit`, `action`, `up`…), and the tests read what each one sees.
 *
 * The client modules keep their state at module level: each player gets their own copy (`vi.resetModules`).
 */
import { vi } from "vitest";
import { provideTacticalServer, startTacticalBattle, stopTacticalBattle, tacticalEncounter, tacticalItem, tacticalSkill, tacticalUnit } from "../server";
import type { TacticalResult } from "../server";
import { TACTICAL_I18N } from "../core/messages";
import type { BattlePacket, BattleState, Unit } from "../core/types";

/** The English texts of the battle, parameters filled in: what a player reads. */
export const english = (key: string, params: Record<string, unknown> = {}) =>
  ((TACTICAL_I18N.en as Record<string, string>)[key] ?? key).replace(/\{(\w+)\}/g, (m, name: string) => (name in params ? String(params[name]) : m));

const heroes = [{ hero: true, seat: 0, x: 3, y: 5 }, { hero: true, seat: 1, x: 4, y: 5 }];
const archer = (name: string, hp: number, power: number, move: number) =>
  tacticalUnit({ name, tactical: { role: "archer", battler: "guard", stats: { hp, sp: 0, power, range: 3, move } } });

/** The data of the scenarios: two heroes at (3, 5) and (4, 5), the enemies of each encounter above them. */
export const database: Record<string, unknown> = {
  blast: tacticalSkill({ name: "Blast", spCost: 10, power: 30, tactical: { range: 3, shape: "single", visual: "fire", color: 0xff7744 } }),
  nova: tacticalSkill({ name: "Nova", spCost: 10, power: 30, tactical: { range: 3, shape: "square", visual: "frost", color: 0x77ccff } }),
  mega: tacticalSkill({ name: "Mega", spCost: 30, power: 90, tactical: { range: 3, shape: "single", visual: "fire", color: 0xff0000 } }),
  potion: tacticalItem({ name: "Potion", hpValue: 40 }),
  ether: tacticalItem({ name: "Ether", spValue: 15 }),
  brute: tacticalUnit({ name: "Brute", tactical: { role: "warrior", battler: "guard", stats: { hp: 60, sp: 0, power: 15, range: 1, move: 3 } } }),
  imp: archer("Imp", 20, 12, 2),
  post: archer("Post", 15, 12, 0),
  sentinel: archer("Sentinel", 60, 12, 2),
  reaper: archer("Reaper", 60, 400, 2),
  melee: tacticalEncounter({ name: "Melee", tactical: { allies: heroes, enemies: [{ unit: "brute", x: 3, y: 3 }] } }),
  area: tacticalEncounter({ name: "Area", tactical: { allies: heroes, enemies: [{ unit: "imp", x: 3, y: 2 }, { unit: "imp", x: 4, y: 2 }] } }),
  limits: tacticalEncounter({ name: "Limits", tactical: { allies: heroes, enemies: [{ unit: "sentinel", x: 3, y: 2 }, { unit: "sentinel", x: 6, y: 0 }] } }),
  items: tacticalEncounter({ name: "Items", tactical: { allies: heroes, enemies: [{ unit: "post", x: 3, y: 2 }] } }),
  doom: tacticalEncounter({ name: "Doom", tactical: { allies: heroes, enemies: [{ unit: "reaper", x: 3, y: 2 }, { unit: "reaper", x: 4, y: 2 }] } }),
  arena: tacticalEncounter({ name: "Arena", tactical: { allies: [{ hero: true, x: 4, y: 6 }], enemies: [{ hero: true, x: 4, y: 0 }] } }),
};

export interface Loadout {
  skills?: string[];
  items?: Record<string, number>;
}

let count = 0;
/** A player of the map with what a battle reads and writes: HP, SP, parameters, skills, an inventory. */
function makePlayer(name: string, loadout: Loadout = {}) {
  const listeners = new Map<string, (data?: any) => void>();
  const packets: BattlePacket[] = [];
  let resolveOpen: (value: unknown) => void = () => {};
  let deliver: (packet: BattlePacket) => void = () => {};
  const gui = {
    open: vi.fn((data: BattlePacket) => {
      packets.push(data);
      deliver(data);
      return new Promise((resolve) => (resolveOpen = resolve));
    }),
    update: (data: BattlePacket) => {
      packets.push(data);
      deliver(data);
    },
    on: (event: string, cb: (data?: any) => void) => listeners.set(event, cb),
    close: vi.fn((result: unknown) => resolveOpen(result)),
  };
  const inventory = new Map(Object.entries(loadout.items ?? {}));
  const player = {
    id: `${name.toLowerCase()}-${++count}`,
    name,
    hp: 100,
    sp: 20,
    param: { maxHp: 100, maxSp: 20 },
    graphics: ["hero"],
    x: 0,
    y: 0,
    setGraphic: vi.fn(),
    skills: () => (loadout.skills ?? []).map((id) => ({ id })),
    items: () => [...inventory].filter(([, n]) => n > 0).map(([id, quantity]) => ({ id, quantity })),
    equipments: () => [],
    removeItem: vi.fn((id: string, n = 1) => void inventory.set(id, (inventory.get(id) ?? 0) - n)),
    databaseById: (id: string) => {
      if (!database[id]) throw new Error(`not found: ${id}`);
      return database[id];
    },
    getCurrentMap: () => sharedMap,
    gui: () => gui,
  };
  return { player, gui, listeners, packets, inventory, connect: (fn: (packet: BattlePacket) => void) => (deliver = fn) };
}
const sharedMap = {};

/** The client of a player: their own copy of the HUD state, connected to their GUI. */
async function makeClient(seat: ReturnType<typeof makePlayer>) {
  vi.resetModules();
  const state = await import("../client/state");
  const input = await import("../client/input-controller");
  state.connectEngine({ t: english, playerIdSignal: () => seat.player.id, globalConfig: {} } as never);
  state.connectHost({
    command: (envelope) => seat.listeners.get("command")?.(envelope),
    pace: (value) => seat.listeners.get("pace")?.({ pace: value }),
    close: () => seat.listeners.get("close")?.({}),
    enter: () => () => {},
    started: () => {},
    ended: () => {},
  });
  seat.connect((packet) => void state.receive(packet));
  return { state, press: input.dispatch };
}

export type Player = Awaited<ReturnType<typeof makeSide>>;

async function makeSide(name: string, loadout?: Loadout) {
  const seat = makePlayer(name, loadout);
  const client = await makeClient(seat);
  const { state } = client;
  const view = () => state.battle() as BattleState;
  const me = {
    ...seat,
    ...client,
    /** Presses the commands of the keyboard one after the other, as the player does. */
    keys: async (...commands: Parameters<typeof client.press>[0][]) => {
      for (const command of commands) {
        client.press(command);
        await vi.advanceTimersByTimeAsync(50);
      }
    },
    /** Their hero, as their screen shows it. */
    hero: (): Unit => view().units.find((u) => u.player === seat.player.id)!,
    /** The bottom line of their HUD. */
    hint: () => state.hint(),
    /** The entries of their action menu, the focused one marked. */
    menu: () => state.menuItems().map((item, i) => `${i === state.menuIndex() ? ">" : ""}${item.id}${item.disabled ? " (greyed)" : ""}`),
    view,
  };
  return me;
}

/** Lets the battle play: the server, the animations of both screens. */
export const settle = (ms = 3000) => vi.advanceTimersByTimeAsync(ms);

/** Two players, A and B, in a co-op battle against the AI, or in a duel (A against B). Both enter it. */
export async function play(encounter: string, o: { a?: Loadout; b?: Loadout; duel?: boolean } = {}) {
  vi.useFakeTimers();
  provideTacticalServer();
  const a = await makeSide("Alice", o.a);
  const b = await makeSide("Bob", o.b);
  const result = startTacticalBattle(
    o.duel ? { players: [a.player as never], versus: [b.player as never], encounter } : { players: [a.player as never, b.player as never], encounter },
  ) as Promise<TacticalResult>;
  await settle(0);
  // "Enter the battle" on both screens.
  await a.keys("action");
  await b.keys("action");
  await settle();
  const leave = (side: Player) => stopTacticalBattle(side.player as never);
  return { a, b, result, leave };
}
