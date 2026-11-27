/**
 * Two players play a turn-based battle as they would in the game: a real battle on the server, and for each player
 * their own client (the session of their battle screen, its scene and its director), fed with the packets of their
 * GUI and sending their orders back. The players press the controls of the keyboard (`action`, `down`, `escape`…)
 * and the tests read what each one sees: phase, menu, target, toast, result.
 *
 * The client modules keep their state at module level: each player gets their own copy (`vi.resetModules`). The
 * scene has no Pixi stage here: `settle` moves its clock as the stage would, frame by frame.
 */
import { vi } from "vitest";
import type { RpgPlayer } from "@rpgjs/server";
import { provideTurnBattleServer, startTurnBattle, type TurnBattleServerOptions } from "../server";
import type { BattlePacket, BattleResult, Combatant } from "../core";
import { catalog, goblin, stats } from "./fixtures";

/** A battler sheet as a game registers it: one standing pose. */
const sheet = (id: string) => ({
  id,
  image: `/${id}.png`,
  framesWidth: 4,
  framesHeight: 4,
  width: 128,
  height: 128,
  textures: { idle: { animations: [[{ time: 0, frameX: 0, frameY: 0 }, { time: 10 }]] } },
});

/** The server of the scenarios: the skills and items of the fixtures, goblins, one hero per player. */
export function serverOptions(over: Partial<TurnBattleServerOptions> = {}): TurnBattleServerOptions {
  return {
    ...catalog,
    skills: { ...catalog.skills, ultima: { id: "ultima", name: "Ultima", kind: "magical", scope: "allEnemies", power: 400, spCost: 99 } },
    enemies: {
      goblin: goblin("x", { stats: stats({ maxHp: 60, atk: 5, agi: 5 }), rewards: { exp: 10, gold: 5 } }),
      ogre: goblin("x", { name: "Ogre", stats: stats({ maxHp: 5000, atk: 400, agi: 99 }), rewards: { exp: 0, gold: 0 } }),
    },
    troops: { duo: { id: "duo", enemies: ["goblin", "goblin"] }, ogre: { id: "ogre", enemies: ["ogre"] } },
    hero: (_p, { index, side }) => ({ battler: side === "enemy" || index ? "mage" : "knight" }),
    party: () => [],
    ...over,
  };
}

let seq = 0;
/** A player of the map, with what a battle reads and writes (as in `server.spec.ts`). */
function fakePlayer(name: string, o: { skills?: string[]; items?: Record<string, number> } = {}) {
  const handlers: Record<string, (data: any) => unknown> = {};
  let resolveOpen: (v: unknown) => void = () => {};
  let deliver: (packet: BattlePacket) => void = () => {};
  const packets: BattlePacket[] = [];
  const gui = {
    on: (event: string, cb: (data: any) => unknown) => (handlers[event] = cb),
    open: vi.fn((data: BattlePacket) => {
      packets.push(data);
      deliver(data);
      return new Promise((r) => (resolveOpen = r));
    }),
    update: vi.fn((data: BattlePacket) => {
      packets.push(data);
      deliver(data);
    }),
    close: vi.fn((data?: unknown) => resolveOpen(data ?? null)),
  };
  const bag = new Map(Object.entries(o.items ?? { potion: 2 }));
  const player = {
    id: `${name.toLowerCase()}-${++seq}`,
    name,
    hp: 300,
    sp: 20,
    exp: 0,
    gold: 0,
    param: { maxHp: 400, maxSp: 50, str: 60, int: 25, agi: 30, dex: 10 },
    atk: 12,
    pdef: 18,
    sdef: 14,
    skills: () => (o.skills ?? ["slash", "cure"]).map((id) => ({ id })),
    items: () => [...bag].filter(([, n]) => n > 0).map(([id, n]) => ({ id: () => id, quantity: () => n })),
    databaseById: (key: string) => {
      throw new Error(`not found: ${key}`);
    },
    turnBattle: Object.assign(() => "", { set: () => {} }),
    hooks: {
      getHookFunctions: () => [],
      callHooks: () => ({ subscribe: (s: { next(v: unknown): void; complete(): void }) => (s.next([]), s.complete()) }),
    },
    equipments: () => [],
    gui: () => gui,
    getCurrentMap: () => ({ id: "map-1" }),
    removeItem: vi.fn((id: string, n = 1) => void bag.set(id, (bag.get(id) ?? 0) - n)),
    addItem: vi.fn(),
  };
  return { player: player as unknown as RpgPlayer & typeof player, handlers, gui, packets, bag, connect: (fn: typeof deliver) => (deliver = fn) };
}

/** The battle screen of a player: their own session, scene and controls, connected to their GUI. */
async function makeClient(seat: ReturnType<typeof fakePlayer>, clientOptions: Record<string, unknown> = {}) {
  vi.resetModules();
  const session = await import("../client/session");
  const state = await import("../client/state");
  const { scene } = await import("../client/scene");
  const { turnBattleKeys } = await import("../client/input");
  session.configureSession(
    {
      interact: (name, data) => void seat.handlers[name]?.(data),
      registerSheet: () => {},
      getSheet: (id) => sheet(id) as never,
      hideOtherGuis: () => () => {},
      music: () => () => {},
      callHooks: async () => [],
    },
    clientOptions,
  );
  seat.connect((packet) => session.receive(packet));
  return { session, state, scene, keys: turnBattleKeys };
}

export type Side = Awaited<ReturnType<typeof makeSide>>;

async function makeSide(name: string, loadout?: Parameters<typeof fakePlayer>[1], clientOptions?: Record<string, unknown>) {
  const seat = fakePlayer(name, loadout);
  const client = await makeClient(seat, clientOptions);
  const { state } = client;
  const latest = () => seat.packets.at(-1)!.state;
  return {
    ...seat,
    ...client,
    /** Presses the controls one after the other, as the player does. */
    press: async (...commands: (keyof typeof client.keys)[]) => {
      for (const command of commands) {
        client.keys[command]();
        await frames(60);
      }
    },
    /** The entries of the menu shown, the focused one marked. */
    menu: () => state.menuEntries().map((e, i) => `${i === state.menuIndex() ? ">" : ""}${e.id}${e.disabled ? " (greyed)" : ""}`),
    /** Their hero, as the server has it now. */
    hero: (): Combatant => latest().combatants.find((c) => c.id === `player:${seat.player.id}`)!,
    latest,
  };
}

/** Every screen of the battle, ticked by `frames`. */
const screens: { scene: { update(ms: number): void } }[] = [];
/** Lets the battle play for `ms`: the server timers, and the scenes of both screens frame by frame. */
export async function frames(ms: number) {
  for (let left = ms; left > 0; left -= 20) {
    for (const s of screens) s.scene.update(20);
    await vi.advanceTimersByTimeAsync(20);
  }
}
/** Lets the screens play until `done` is true (the choreography of a turn, the enemies…), at most `ms`. */
export async function until(done: () => boolean, ms = 60_000) {
  for (let left = ms; left > 0 && !done(); left -= 100) await frames(100);
  return done();
}

/** Two players, A and B: partners against a troop, or the two sides of a duel. */
export async function play(o: { troop?: string; duel?: boolean; turnTimer?: number | false; a?: Parameters<typeof fakePlayer>[1]; b?: Parameters<typeof fakePlayer>[1]; server?: Partial<TurnBattleServerOptions>; client?: Record<string, unknown> } = {}) {
  vi.useFakeTimers();
  screens.length = 0;
  const provider = provideTurnBattleServer(serverOptions(o.server));
  const a = await makeSide("Alice", o.a, o.client);
  const b = await makeSide("Bob", o.b, o.client);
  screens.push(a, b);
  const result = startTurnBattle(
    o.duel
      ? { players: [a.player], versus: [b.player], seed: 5, turnTimer: o.turnTimer ?? false }
      : { players: [a.player, b.player], troop: o.troop ?? "duo", seed: 5, turnTimer: o.turnTimer ?? false },
  ) as Promise<BattleResult>;
  await frames(0);
  /** The player whose hero has the turn, and the other one. */
  const turn = () => {
    const s = a.latest();
    const owner = s.combatants.find((c) => c.id === s.actor)?.owner;
    return owner === a.player.id ? a : owner === b.player.id ? b : null;
  };
  const other = (side: Side) => (side === a ? b : a);
  /** The player disconnects (RPGJS calls the plugin's player hook). */
  const disconnect = (side: Side) => findHook(provider, "onDisconnected")(side.player);
  return { a, b, result, turn, other, disconnect };
}

/** A player hook declared by the plugin module (createModule → server definition). */
function findHook(provider: unknown, name: string): (...a: any[]) => any {
  const seen = new Set<unknown>();
  const visit = (v: any): any => {
    if (!v || typeof v !== "object" || seen.has(v)) return undefined;
    seen.add(v);
    if (typeof v.player?.[name] === "function") return v.player[name];
    for (const k of Object.keys(v)) {
      const found = visit(v[k]);
      if (found) return found;
    }
    return undefined;
  };
  const fn = visit(provider);
  if (!fn) throw new Error(`hook ${name} not found`);
  return fn;
}
