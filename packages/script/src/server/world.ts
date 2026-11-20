/**
 * The world of a script in an RPGJS game: the player, the event, the map. It implements the port `ScriptWorld` with the API of
 * RPGJS, so a script changes the game the way the code of a game would, and the same script gives the same result in a
 * simulation.
 */
import type { RpgEvent, RpgMap, RpgPlayer, RpgPlayerRoom } from "@rpgjs/server";
import { MAXHP, MAXSP, Vector2 } from "@rpgjs/common";
import { type EnemySpawnOptions, MAX_MOVE_SECONDS, MAX_SCRIPT_EVENTS, MAX_SCRIPT_MOVERS, MAX_SCRIPT_SHAPES, type AttachedShapeOptions, type BattleOptions, type BattleOutcome, type DirectionName, type DistanceOptions, type MoveEventOptions, type MoveTarget, type TileSnapshot, type Choice, type DataPort, type DataRecord, type EventOptions, type EventSnapshot, type HotbarEntryOptions, type LightingTransition, type MapPort, type PlayerPort, type ProjectileLaunchOptions, type ScriptWorld, type ShakeOptions, type ShapeOptions, type ShapeSnapshot, type SoundOptions, type VariableValue, type VisualEffectPlayOptions, type SkillUseOptions } from "../game/impl";
import type { SharedDecl } from "../core/interpreter";

/** A value that RPGJS keeps in a signal is read by calling it. */
const read = <T>(value: unknown): T => (typeof value === "function" ? (value as () => T)() : (value as T));
const number = (value: unknown): number => (typeof value === "number" ? value : 0);

/** Prefix of the properties of a map that belong to scripts, so that a script cannot reach another property of the map. */
export const SHARED_PREFIX = "script_";

/** What a projectile launched by a script flies at when it gives no speed or range, in pixels per second and pixels. */
const DEFAULT_PROJECTILE_SPEED = 300;
const DEFAULT_PROJECTILE_RANGE = 600;

/** The longest a script can make a player wait. */
const MAX_WAIT_SECONDS = 60;

const isMap = (place: unknown): place is RpgMap => !!place && typeof (place as { setSync?: unknown }).setSync === "function";

/** The events scripts made, by map: a script removes these and no other, and makes `MAX_SCRIPT_EVENTS` of them at most. */
const madeByScripts = new WeakMap<object, Set<string>>();
/** The zones scripts made, by map. */
const shapesMadeByScripts = new WeakMap<object, Set<string>>();
let eventCounter = 0;

/** The zones scripts attached to events, by map: the event, and what stops the zone from turning with it. */
const attachedByScripts = new WeakMap<object, Map<string, { event: any; unsubscribe?: () => void }>>();
/** What scripts make the events of a map do (a move, a follow, a flight), by event: stopping it ends it. */
const controlsByMap = new WeakMap<object, Map<string, { stop(): void }>>();

/** How close the center of an event comes to its goal for it to have arrived, in pixels (the move stops within 48). */
const ARRIVE_DISTANCE = 52;
/** How often a move, a follow or a flight looks where the event is, in milliseconds. */
const MOVE_CHECK_MS = 50;
const KEEP_CHECK_MS = 200;

/** The tags of a thing of the game: a list of strings, each once. */
const tagList = (value: unknown): string[] =>
  Array.isArray(value) ? [...new Set(value.filter((tag): tag is string => typeof tag === "string" && tag.length > 0))] : [];

/** The center of a player or an event, in pixels: its physics body, otherwise its top-left plus half its hitbox. */
function centerOf(map: any, object: any): { x: number; y: number } {
  const body = map?.physic?.getEntityByUUID?.(object.id);
  if (body?.position) return { x: Number(body.position.x), y: Number(body.position.y) };
  const box = typeof object.hitbox === "function" ? object.hitbox() : { w: 0, h: 0 };
  return { x: number(read(object.x)) + number(box?.w) / 2, y: number(read(object.y)) + number(box?.h) / 2 };
}
const directionToward = (from: { x: number; y: number }, to: { x: number; y: number }): DirectionName => {
  const dx = to.x - from.x, dy = to.y - from.y;
  return Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : dy > 0 ? "down" : "up";
};
const BATTLE_HOOKS: Record<string, string> = { turn: "startTurnBased", tactical: "startTactical" };
const OUTCOMES = new Set(["victory", "defeat", "escape"]);

/**
 * Plays a troop with the battle systems of the game: the `studioBattle` hooks of its modules (`start`, `startTurnBased`,
 * `startTactical`), the contract the battle blocks of the Studio use. The module that plays the troop returns its result
 * (`{ outcome }` or the outcome); a player who leaves a tactical battle (`abandon`) escaped.
 */
function playBattle(player: RpgPlayer, troopId: string, options: BattleOptions): Promise<BattleOutcome | null> {
  const hooks = (player as any).hooks;
  if (!hooks?.callHooks) return Promise.resolve(null);
  const name = options.kind ? BATTLE_HOOKS[options.kind] : "start";
  return new Promise((resolve, reject) => {
    let outcome: BattleOutcome | null = null;
    hooks.callHooks(`server-studioBattle-${name}`, player, troopId).subscribe({
      next: (results: unknown) => {
        for (const result of Array.isArray(results) ? results : [results]) {
          const value = result && typeof result === "object" ? (result as { outcome?: unknown }).outcome : result;
          const found = value === "abandon" ? "escape" : value;
          if (outcome === null && typeof found === "string" && OUTCOMES.has(found)) outcome = found as BattleOutcome;
        }
      },
      error: reject,
      complete: () => resolve(outcome),
    });
  });
}

/**
 * Asks the modules of the game to turn an event into an enemy: their `scriptEnemy.create(event, enemyId)` hooks. A module that
 * knows the enemy makes it (with Action Battle, `createActionEnemy(event, preset)`; a Studio game, from its database) and returns
 * true; the others return nothing.
 */
function makeEnemy(event: RpgEvent, enemyId: string): Promise<boolean> {
  const hooks = (event as any).hooks;
  if (!hooks?.callHooks) return Promise.resolve(false);
  return new Promise((resolve, reject) => {
    let made = false;
    hooks.callHooks("server-scriptEnemy-create", event, enemyId).subscribe({
      next: (results: unknown) => { for (const result of Array.isArray(results) ? results : [results]) if (result === true) made = true; },
      error: reject,
      complete: () => resolve(made),
    });
  });
}
/** What RPGJS throws when an action cannot be done (not learned, not in the inventory…): the script hears it as false. */
const attempt = (action: () => unknown): boolean => {
  try { action(); return true; } catch { return false; }
};
const idsOf = (list: unknown): string[] =>
  (Array.isArray(list) ? list : []).map((entry: any) => String(read(entry?.id) ?? "")).filter(Boolean);

/** Emits a signal of the game, for the world that walks an event (`event.arrived`). */
export type WorldEmit = (signal: string, payload: Record<string, unknown>, context: { player: RpgPlayer; map?: RpgMap | null; event?: RpgEvent | null }) => void;

/** A state of the map as plain data: what RPGJS keeps may hold fields set to undefined, which a script has no use for. */
const plainCopy = (state: unknown): object | null => (state == null ? null : JSON.parse(JSON.stringify(state)));

/** The map of a script, over the map of RPGJS: the events a script makes are real events that listen to the same signals. */
function mapPortOf(map: RpgMap, player: RpgPlayer, emit?: WorldEmit): MapPort {
  const m = map as any;
  const made = madeByScripts.get(map) ?? madeByScripts.set(map, new Set()).get(map)!;
  const madeShapes = shapesMadeByScripts.get(map) ?? shapesMadeByScripts.set(map, new Set()).get(map)!;
  const attached = attachedByScripts.get(map) ?? attachedByScripts.set(map, new Map()).get(map)!;
  const controls = controlsByMap.get(map) ?? controlsByMap.set(map, new Map()).get(map)!;
  const shapeSnapshot = (s: any): ShapeSnapshot => ({ name: String(s.name), x: number(s.x), y: number(s.y), width: number(s.width), height: number(s.height) });
  const snapshot = (e: any): EventSnapshot => ({ id: String(e.id ?? ""), name: String(read(e.name) ?? ""), x: number(read(e.x)), y: number(read(e.y)), direction: String(read(e.direction) ?? "down") });
  const eventOf = (id: string): any => {
    const event = m.getEvent(id);
    if (!event) throw new Error(`there is no event "${id}" on the map`);
    return event;
  };
  /** Ends what scripts made an event do, if anything. */
  const release = (id: string) => {
    const control = controls.get(id);
    controls.delete(id);
    control?.stop();
  };
  const control = (id: string, stop: () => void) => {
    if (!controls.has(id) && controls.size >= MAX_SCRIPT_MOVERS) throw new Error(`scripts move ${MAX_SCRIPT_MOVERS} events of a map at most at once`);
    const entry = { stop };
    controls.set(id, entry);
    return () => { if (controls.get(id) === entry) controls.delete(id); };
  };
  const stopMoving = (event: any) => { try { event.stopMoveTo?.(); } catch { /* the event left the map */ } };
  /** Keeps an event at a distance of the player (follow) or away from them (flee), until it is stopped or the player leaves. */
  const keep = (id: string, mode: "follow" | "flee", distance: number) => {
    const event = eventOf(id);
    release(id);
    let stopped = false, moving = false;
    const done = control(id, () => { stopped = true; stopMoving(event); });
    const loop = () => {
      if (stopped) return;
      try { step(); } catch {
        // the map or the player is gone (the game closed it): the follow ends
        done(); stopped = true; stopMoving(event); return;
      }
      if (!stopped) setTimeout(loop, KEEP_CHECK_MS);
    };
    const step = () => {
      if (m.getEvent(id) !== event || (player.getCurrentMap?.() as unknown) !== map) { done(); stopped = true; stopMoving(event); return; }
      const from = centerOf(m, event), to = centerOf(m, player), d = Math.hypot(to.x - from.x, to.y - from.y);
      if (mode === "follow") {
        if (d > distance + 16 && !moving) { event.moveTo(player); moving = true; }
        else if (d <= distance && moving) { stopMoving(event); moving = false; }
      } else if (d < distance) {
        // run along the line from the player through the event, a little beyond the distance
        const ux = d > 0 ? (from.x - to.x) / d : 1, uy = d > 0 ? (from.y - to.y) / d : 0, reach = distance - d + 32;
        event.moveTo({ x: from.x + ux * reach, y: from.y + uy * reach });
        moving = true;
      } else if (moving) { stopMoving(event); moving = false; }
    };
    loop();
  };
  return {
    get id() { return String(m.id ?? ""); },
    async createDynamicEvent(o: EventOptions) {
      if (made.size >= MAX_SCRIPT_EVENTS) throw new Error(`a script makes ${MAX_SCRIPT_EVENTS} events on a map at most`);
      const id = o.id ?? `script-event-${Date.now().toString(36)}-${++eventCounter}`;
      if (m.getEvent(id)) throw new Error(`an event "${id}" is already on the map`);
      const definition = {
        name: o.name ?? "",
        onInit(this: any) {
          this.name = o.name ?? "";
          this.through = o.through ?? false;
          if (o.graphic) this.setGraphic(o.graphic);
        },
      };
      const created: string | undefined = await m.createDynamicEvent({ id, x: o.x, y: o.y, ...(o.hitbox ? { hitbox: o.hitbox } : {}), event: definition });
      if (!created) throw new Error("the map did not make the event");
      made.add(created);
      return created;
    },
    getEvent(id) {
      const event = m.getEvent(id);
      return event ? snapshot(event) : undefined;
    },
    getEvents: () => (m.getEvents() as unknown[]).map(snapshot),
    removeEvent(id) {
      if (!made.has(id)) return false;
      m.removeEvent(id);
      made.delete(id);
      return true;
    },
    getPlayers: () => (m.getPlayers() as any[]).map((p) => ({ id: String(p.id), name: String(read(p.name) ?? "") })),
    getVariable: (key) => m.getVariable(key),
    setVariable: (key, value: VariableValue) => m.setVariable(key, value),
    hasVariable: (key) => !!m.hasVariable(key),
    removeVariable: (key) => !!m.removeVariable(key),
    getWeather: () => plainCopy(m.getWeather()),
    setWeather: (state) => void m.setWeather(state),
    patchWeather: (patch) => void m.patchWeather(patch),
    clearWeather: () => m.clearWeather(),
    getLighting: () => plainCopy(m.getLighting()),
    setLighting: (state) => void m.setLighting(state),
    patchLighting: (patch) => void m.patchLighting(patch),
    clearLighting: () => m.clearLighting(),
    setDay: () => void m.setDay(),
    setNight: () => void m.setNight(),
    transitionLighting: (to, options: LightingTransition = {}) => void m.transitionLighting(to, options),
    createShape(o: ShapeOptions) {
      if (madeShapes.size >= MAX_SCRIPT_SHAPES) throw new Error(`a script makes ${MAX_SCRIPT_SHAPES} zones on a map at most`);
      const name = o.name ?? `script-zone-${Date.now().toString(36)}-${++eventCounter}`;
      if (m.getShape(name)) throw new Error(`a zone "${name}" is already on the map`);
      const shape = m.createShape({ ...o, name });
      madeShapes.add(String(shape.name));
      return String(shape.name);
    },
    getShape(name) {
      const shape = m.getShape(name);
      return shape ? shapeSnapshot(shape) : undefined;
    },
    getShapes: () => (m.getShapes() as unknown[]).map(shapeSnapshot),
    removeShape(name) {
      if (!madeShapes.has(name)) return false;
      const zone = attached.get(name);
      if (zone) {
        // a zone attached to an event lives in the physics of the map and in the event
        const zoneId = zone.event._zoneIdMap?.get(name);
        if (zoneId !== undefined) m.physic?.getZoneManager?.().removeZone(zoneId);
        zone.event._zoneIdMap?.delete(name);
        zone.event._attachedShapes?.delete(name);
        zone.unsubscribe?.();
        attached.delete(name);
      } else m.removeShape(name);
      madeShapes.delete(name);
      return true;
    },
    attachShape(eventId, o: AttachedShapeOptions) {
      const event = eventOf(eventId);
      if (madeShapes.size >= MAX_SCRIPT_SHAPES) throw new Error(`a script makes ${MAX_SCRIPT_SHAPES} zones on a map at most`);
      const name = o.name ?? `script-zone-${Date.now().toString(36)}-${++eventCounter}`;
      if (m.getShape(name) || madeShapes.has(name)) throw new Error(`a zone "${name}" is already on the map`);
      const { follow, ...options } = o;
      const direction = options.direction ?? (follow === "direction" ? String(read(event.direction) ?? "down") : undefined);
      const shape = event.attachShape(name, { ...options, name, ...(direction ? { direction } : {}) });
      if (!shape) throw new Error(`the event "${eventId}" is not on the map: the zone was not made`);
      let unsubscribe: (() => void) | undefined;
      if (follow === "direction") {
        // the cone turns with the event
        const zoneId = event._zoneIdMap?.get(name);
        const subscription = event.direction?.observable?.subscribe?.((value: unknown) => {
          if (zoneId !== undefined) m.physic?.getZoneManager?.().updateZone(zoneId, { direction: String(value) });
        });
        unsubscribe = subscription ? () => subscription.unsubscribe() : undefined;
      }
      madeShapes.add(name);
      attached.set(name, { event, unsubscribe });
      return name;
    },
    moveEvent(id, to: MoveTarget, o: MoveEventOptions) {
      const event = eventOf(id);
      release(id);
      if (o.speed !== undefined) event.speed = o.speed;
      // RPGJS walks to the center of its target: a position is where the top-left of the event arrives
      const box = typeof event.hitbox === "function" ? event.hitbox() : { w: 0, h: 0 };
      const goal = () => (to === "player" ? centerOf(m, player) : { x: to.x + number(box?.w) / 2, y: to.y + number(box?.h) / 2 });
      let finish: (arrived: boolean) => void = () => {};
      const arrived = new Promise<boolean>((resolve) => { finish = resolve; });
      let over = false;
      const done = control(id, () => { if (!over) { over = true; stopMoving(event); finish(false); } });
      event.moveTo(to === "player" ? player : goal());
      const started = Date.now();
      const check = () => {
        if (over) return;
        try { look(); } catch {
          // the map or the player is gone: the move ends
          over = true; done(); stopMoving(event); finish(false); return;
        }
        if (!over) setTimeout(check, MOVE_CHECK_MS);
      };
      const look = () => {
        if (m.getEvent(id) !== event) { over = true; done(); finish(false); return; }
        const at = centerOf(m, event), target = goal();
        if (Math.hypot(target.x - at.x, target.y - at.y) <= ARRIVE_DISTANCE) {
          over = true;
          done();
          stopMoving(event);
          finish(true);
          emit?.("event.arrived", {
            event: { id: String(event.id), name: String(read(event.name) ?? ""), tags: tagList(event.tags) },
            x: number(read(event.x)), y: number(read(event.y)),
          }, { player, map, event });
          return;
        }
        if (Date.now() - started > MAX_MOVE_SECONDS * 1000) { over = true; done(); stopMoving(event); finish(false); }
      };
      setTimeout(check, MOVE_CHECK_MS);
      return o.wait ? arrived : true;
    },
    followPlayer: (id, o: DistanceOptions) => keep(id, "follow", o.distance ?? 48),
    fleePlayer: (id, o: DistanceOptions) => keep(id, "flee", o.distance ?? 160),
    stopEvent(id) {
      const event = eventOf(id);
      release(id);
      stopMoving(event);
    },
    turnEvent(id, direction) {
      const event = eventOf(id);
      event.changeDirection(direction === "player" ? directionToward(centerOf(m, event), centerOf(m, player)) : direction);
    },
    async teleportEvent(id, position) {
      const event = eventOf(id);
      release(id);
      await event.teleport(position);
    },
    setEventVisible(id, visible) {
      if (visible) { if (!m.isEventSuspended?.(id)) eventOf(id); m.resumeEvent(id); return; }
      eventOf(id);
      release(id);
      m.suspendEvent(id);
    },
    getTile(x, y): TileSnapshot | undefined {
      const tiled = m.tiled;
      if (!tiled || typeof tiled.getTileByPosition !== "function") return undefined;
      const tileWidth = number(tiled.tilewidth), tileHeight = number(tiled.tileheight);
      if (tileWidth <= 0 || tileHeight <= 0) return undefined;
      const cellX = Math.floor(x / tileWidth), cellY = Math.floor(y / tileHeight);
      if (cellX < 0 || cellY < 0 || cellX >= number(tiled.width) || cellY >= number(tiled.height)) return undefined;
      const info = tiled.getTileByPosition(x, y, [0, 0], { populateTiles: true });
      const layers = ((info?.tiles ?? []) as any[]).map((tile) => ({ properties: plainCopy(tile?.properties ?? {}) as Record<string, unknown> }));
      return { x: cellX, y: cellY, collision: !!info?.hasCollision, properties: Object.assign({}, ...layers.map((l) => l.properties)), layers };
    },
    setEventGraphic(id, graphic) {
      eventOf(id).setGraphic(graphic);
    },
    playEventAnimation(id, animationName, times) {
      eventOf(id).setAnimation(animationName, times);
    },
    showEmotionBubble(id, emotion) {
      eventOf(id).showEmotionBubble(emotion);
    },
    async spawnEnemy(o: EnemySpawnOptions) {
      if (made.size >= MAX_SCRIPT_EVENTS) throw new Error(`a script makes ${MAX_SCRIPT_EVENTS} events on a map at most`);
      const id = o.id ?? `script-enemy-${Date.now().toString(36)}-${++eventCounter}`;
      if (m.getEvent(id)) throw new Error(`an event "${id}" is already on the map`);
      const created: string | undefined = await m.createDynamicEvent({ id, x: o.x, y: o.y, event: { name: o.name ?? o.enemy, onInit(this: any) { this.name = o.name ?? o.enemy; } } });
      const event = created ? m.getEvent(created) : undefined;
      if (!event) throw new Error("the map did not make the event");
      if (!(await makeEnemy(event, o.enemy))) {
        m.removeEvent(created);
        throw new Error(`the game has no enemy "${o.enemy}": a module of the game makes its enemies with scriptEnemy.create(event, enemyId)`);
      }
      made.add(created!);
      return created!;
    },
    lineOfSight(from, to) {
      const physic = m.physic;
      if (!physic?.raycast) return true;
      const start = new Vector2(from.x, from.y), end = new Vector2(to.x, to.y);
      const direction = end.sub(start), length = direction.length();
      if (length < 1e-5) return true;
      direction.normalizeInPlace();
      // only what stands still blocks the sight: walls and static hitboxes, not players or events
      return physic.raycast(start, direction, length, undefined, (entity: any) => entity.isStatic?.() === true) === null;
    },
    playSound: (id, options: SoundOptions = {}) => m.playSound(id, options),
    stopSound: (id) => m.stopSound(id),
    showAnimation: (position, graphic, animationName) => m.showAnimation(position, graphic, animationName),
    showComponentAnimation: (id, position, params) => m.showComponentAnimation(id, position, params),
    shakeMap: (options: ShakeOptions = {}) => m.shakeMap(options),
    launchProjectile(o: ProjectileLaunchOptions) {
      const dx = o.toward.x - o.from.x, dy = o.toward.y - o.from.y, length = Math.hypot(dx, dy);
      const speed = o.speed ?? DEFAULT_PROJECTILE_SPEED, range = o.range ?? DEFAULT_PROJECTILE_RANGE;
      const height = typeof o.arc === "object" ? o.arc.height : undefined;
      const [state] = m.projectiles.emit({
        type: o.projectile,
        origin: o.from,
        direction: { x: dx / length, y: dy / length },
        // A lob lands on `toward`, as far as its range allows.
        ...(o.arc
          ? {
              target: o.toward,
              trajectory: { type: "arc", speed, range, ...(height !== undefined ? { height } : {}) },
              ...(o.landingRadius !== undefined ? { landing: { radius: o.landingRadius } } : {}),
            }
          : { trajectory: { type: "linear", speed, range } }),
        ...(o.delay !== undefined ? { delay: o.delay } : {}),
        ...(o.damage !== undefined
          ? {
              payload: { damage: o.damage },
              // Fixed damage, as is: a hit that follows the battle rules is a skill ($player.useSkill).
              onHit: ({ target }: { target?: any }) => {
                if (typeof target?.hp === "number") target.hp = Math.max(0, target.hp - o.damage!);
              },
            }
          : {}),
        // Launched by the player of the script: it flies through them and its signals fire for them.
      }, o.owner === "player" ? player : undefined);
      if (!state) throw new Error("the map did not launch the projectile");
      return String(state.id);
    },
    playVisualEffect(o: VisualEffectPlayOptions) {
      m.playVisualEffect(o.at, o.effect, {
        ...(o.preset ? { preset: o.preset } : {}),
        ...(o.duration !== undefined ? { duration: o.duration } : {}),
        ...(o.scale !== undefined ? { scale: o.scale } : {}),
      });
    },
  };
}

/** What a room is, as a script sees it: `kind` is "map" for a map, otherwise the kind a gameplay room was registered with. */
export function describeRoom(room: RpgPlayerRoom | RpgMap | null | undefined): { id: string; kind: string } {
  if (!room) return { id: "", kind: "" };
  if (isMap(room)) return { id: String((room as { id?: unknown }).id ?? ""), kind: "map" };
  const descriptor = (room as { descriptor?: { id?: string; kind?: string } }).descriptor;
  return { id: String(descriptor?.id ?? (room as { id?: unknown }).id ?? ""), kind: descriptor?.kind ?? "lobby" };
}

/**
 * The properties shared by the players of a room, as a script sees them. In a map they are declared once, with
 * `map.setSync({ name: { $initial, $syncWithClient, $permanent } })`, and live there. In a gameplay room that is not a map they live
 * in the `state` of the room, under the same prefix, which RPGJS synchronizes with the clients. Either way every player of the room
 * reads and changes the same value. A room with neither (a lobby) has nowhere to keep them: using them says so.
 */
export function sharedPropsOf(place: RpgMap | RpgPlayerRoom | null | undefined, declared: readonly SharedDecl[]): ScriptWorld["sharedProps"] {
  const names = new Set(declared.map((d) => d.name));
  const has = (name: string) => names.has(name);

  if (isMap(place)) {
    const map = place as unknown as Record<string, any>;
    for (const d of declared) {
      const key = SHARED_PREFIX + d.name;
      if (map[key] === undefined) map.setSync({ [key]: { $initial: d.initial, $syncWithClient: d.client, $permanent: d.persist } });
    }
    return { has, get: (name) => map[SHARED_PREFIX + name](), set: (name, value) => map[SHARED_PREFIX + name].set(value) };
  }

  const state = (place as { state?: { (): unknown; update?: (fn: (s: any) => any) => void } } | null | undefined)?.state;
  if (typeof state === "function" && typeof state.update === "function") {
    const read = () => (state() ?? {}) as Record<string, unknown>;
    for (const d of declared) {
      const key = SHARED_PREFIX + d.name;
      if (!(key in read())) state.update!((s) => ({ ...(s ?? {}), [key]: d.initial }));
    }
    return {
      has,
      get: (name) => read()[SHARED_PREFIX + name],
      set: (name, value) => state.update!((s) => ({ ...(s ?? {}), [SHARED_PREFIX + name]: value })),
    };
  }

  const nowhere = () => { throw new Error("shared properties need a map or a gameplay room with a state: this room has neither"); };
  return { has, get: nowhere, set: nowhere };
}

/**
 * The database of the game as a script reads it. RPGJS keeps it in the room (`database()`); a Studio game puts a record of any
 * collection in it as plain data, with `_type` for its collection. A record that is not plain data (a class of the game) is not given.
 */
export function dataPortOf(place: RpgMap | RpgPlayerRoom | null | undefined): DataPort {
  const entries = (): [string, Record<string, unknown>][] => {
    const database = (place as { database?: unknown } | null | undefined)?.database;
    const all = (typeof database === "function" ? (database as () => unknown).call(place) : database) as Record<string, unknown> | undefined;
    return Object.entries(all ?? {}).filter((entry): entry is [string, Record<string, unknown>] => typeof entry[1] === "object" && entry[1] !== null);
  };
  const recordOf = (id: string, data: Record<string, unknown>): DataRecord => {
    const { _type, ...fields } = data;
    return { ...fields, id, type: String(_type ?? "") };
  };
  return {
    get(type, id) {
      const found = entries().find(([key]) => key === id);
      return found && found[1]["_type"] === type ? recordOf(found[0], found[1]) : undefined;
    },
    list: (type) => entries().filter(([, data]) => data["_type"] === type).map(([id, data]) => recordOf(id, data)),
  };
}

/** What the world of a script is built from: the player it acts for, the event and the map, the shared properties it declared, and the payload that fired it. */
export interface RpgjsWorldOptions {
  player: RpgPlayer;
  /** The event the script runs for, if any (`$event`). */
  event?: RpgEvent | null;
  /** The map, when the script runs in one. Default: the map of the player. */
  map?: RpgMap | null;
  /** The room, when it is not the map of the player. Default: the room of the player. */
  room?: RpgPlayerRoom | null;
  /** The shared properties the script declared. */
  shared?: readonly SharedDecl[];
  /** The payload of the signal that fired the script (`$hook`). */
  hook?: Record<string, unknown>;
  /** Where the persistent data of the script's plugin lives. In memory, for the duration of the world, when not given. */
  state?: ScriptWorld["stateProps"];
  /** A whole number between `min` and `max`, both included. */
  rand?: (min: number, max: number) => number;
  /** Emits a signal of the game: an event a script walked arrives (`event.arrived`). Nothing is emitted without it. */
  emit?: WorldEmit;
}

/**
 * The world of a script on a real RPGJS player, event and map: every change goes through the API of RPGJS, so a script changes
 * the game the way the code of a game would. The server owns it: use it where the gameplay state lives.
 *
 * @param options - See `RpgjsWorldOptions`.
 * @returns The world to give to `hostFromApi(GAME_API_DESCRIPTION, GAME_API_IMPL, world)`.
 * @example
 * ```ts
 * const world = createRpgjsWorld({ player, shared: program.shared })
 * await program.call("f", [], hostFromApi(GAME_API_DESCRIPTION, GAME_API_IMPL, world), { steps: 20000, iterations: 100 })
 * ```
 */
export function createRpgjsWorld(options: RpgjsWorldOptions): ScriptWorld {
  const { player, event } = options;
  const p = player as any;
  const map = options.map ?? (player.getCurrentMap() as RpgMap | null) ?? null;
  const room = options.room ?? map ?? player.getCurrentRoom();
  const where = describeRoom(room);
  const data = new Map<string, unknown>();

  const playerPort: PlayerPort = {
    get gold() { return number(p.gold); },
    set gold(value: number) { p.gold = value; },
    get level() { return number(read(p.level)); },
    get name() { return String(read(p.name)); },
    get x() { return number(read(p.x)); },
    get y() { return number(read(p.y)); },
    get direction() { return String(read(p.direction) ?? "down"); },
    get hp() { return number(p.hp); },
    set hp(value: number) { p.hp = value; },
    get sp() { return number(p.sp); },
    set sp(value: number) { p.sp = value; },
    // 0 when the game gives the player no maximum (no parameters)
    get maxHp() { const max = p.param?.[MAXHP]; return Number.isFinite(max) ? max : 0; },
    get maxSp() { const max = p.param?.[MAXSP]; return Number.isFinite(max) ? max : 0; },
    async teleport(position) {
      await p.teleport(position);
    },
    startBattle: (troopId, options) => playBattle(player, troopId, options),
    get exp() { return number(read(p.exp)); },
    set exp(value: number) { p.exp = value; },
    showEmotionBubble(emotion) { p.showEmotionBubble(emotion); },
    hasState: (id) => !!p.getState?.(id),
    getStates: () => idsOf(read(p.states)),
    addState(id) {
      if (p.getState(id)) return false;
      p.addState(id);
      return true;
    },
    removeState(id) {
      if (!p.getState(id)) return false;
      return attempt(() => p.removeState(id));
    },
    hasSkill: (id) => !!p.getSkill?.(id),
    getSkills: () => idsOf(read(p.skills)),
    learnSkill(id) {
      if (p.getSkill(id)) return false;
      p.learnSkill(id);
      return true;
    },
    forgetSkill(id) {
      if (!p.getSkill(id)) return false;
      return attempt(() => p.forgetSkill(id));
    },
    isEquipped: (id) => !!read(p.getItem(id)?.equipped),
    equip: (id, equipped) => attempt(() => p.equip(id, equipped)),
    useItem: (id) => attempt(() => p.useItem(id)),
    getItem(id) {
      const item = p.getItem(id);
      if (!item) return undefined;
      return { id: String(read(item.id) ?? id), name: String(read(item.name) ?? ""), quantity: number(read(item.quantity)) };
    },
    hasItem: (id) => !!p.getItem(id),
    addItem(id, nb) {
      p.addItem(id, nb);
    },
    removeItem(id, nb) {
      // RPGJS refuses to remove what the player does not have: a script just loses nothing
      if (p.getItem(id)) p.removeItem(id, nb);
    },
    getVariable: (key) => p.getVariable(key),
    setVariable: (key, value: VariableValue) => p.setVariable(key, value),
    hasVariable: (key) => !!p.hasVariable(key),
    removeVariable: (key) => !!p.removeVariable(key),
    async showText(text, opts = {}) {
      await p.showText(text, opts);
    },
    async showChoices(text, choices: Choice[]) {
      const picked = await p.showChoices(text, choices);
      return picked ? { text: String(picked.text), value: picked.value } : null;
    },
    async showNotification(message, opts = {}) {
      await p.showNotification(message, opts);
    },
    async openGui(id, data, options = {}) {
      await p.gui(id).open(data, options);
    },
    updateGui(id, data) {
      p.getGui(id)?.update(data);
    },
    closeGui(id, data) {
      p.removeGui(id, data);
    },
    async changeMap(mapId, positions) {
      await p.changeMap(mapId, positions);
    },
    assignHotbarSlot(slot, entry: HotbarEntryOptions) {
      p.assignHotbarSlot(slot, entry);
    },
    useSkill(skillId, options: SkillUseOptions = {}) {
      const room = (p.getCurrentMap?.() ?? null) as any;
      const target = options.target === undefined ? undefined : room?.getEvent?.(options.target) ?? room?.getPlayer?.(options.target);
      if (options.target !== undefined && !target) throw new Error(`there is no event or player "${options.target}" on the map`);
      try {
        p.useSkill(skillId, target);
        return true;
      } catch {
        // Not learned, not enough SP, cooldown, failed hit roll: the script hears it as false.
        return false;
      }
    },
  };

  return {
    player: playerPort,
    room: where,
    ...(map ? { map: mapPortOf(map, player, options.emit) } : {}),
    event: {
      get id() { return event?.id ?? ""; },
      get name() { return String(read((event as any)?.name) ?? ""); },
      get x() { return number(read((event as any)?.x)); },
      get y() { return number(read((event as any)?.y)); },
      get direction() { return String(read((event as any)?.direction) ?? "down"); },
    },
    wait: (seconds) => new Promise<void>((resolve) => setTimeout(resolve, Math.min(Math.max(seconds, 0), MAX_WAIT_SECONDS) * 1000)),
    rand: options.rand ?? ((min, max) => min + Math.floor(Math.random() * (max - min + 1))),
    sharedProps: sharedPropsOf(room, options.shared ?? []),
    data: dataPortOf(room),
    stateProps: options.state ?? { get: (key) => data.get(key), set: (key, value) => void data.set(key, value) },
    hook: options.hook ?? {},
  };
}
