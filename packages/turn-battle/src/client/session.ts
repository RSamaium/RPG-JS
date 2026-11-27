import type { BattleHookArgs } from "@rpgjs/battle-kit/pure";
import type { TurnBattleClientHooks } from "./index";
import {
  bagOf,
  forbids,
  candidates,
  isMultiTarget,
  previewTimeline,
  DEFAULT_WEIGHTS,
  type Beat,
  type BattlePacket,
  type BattleResult,
  type BattleView,
  type Combatant,
  type Command,
  type TargetScope,
} from "../core";
import { commandEntry, commandsOf } from "./menu-entries";
import { Director, chips, publish } from "./director";
import type { FxFn } from "./fx";
import { scene, type Backdrop } from "./scene";
import { loadBattler, placeholderBattler, type BattleSpritesheet, type BattlerHints, type BattlerInfo } from "./sheets";
import { setMuted, sfx } from "./sfx";
import {
  actorId,
  audience,
  banner,
  countdown,
  cinematic,
  cutin,
  faces,
  foeIds,
  menuEntries,
  menuIndex,
  menuCommand,
  menuLevel,
  menuTitle,
  muted,
  order,
  partyIds,
  phase,
  players,
  pvp,
  surrenderArmed,
  surrendered,
  previewing,
  reduced,
  entering,
  result,
  showToast,
  spectating,
  speed,
  t,
  targetName,
  targetInfo,
  viewer,
  waitingFor,
  type MenuEntry,
} from "./state";
import { targetInfoOf } from "./target-info";

/** What the client module gives the session (RPGJS engine services). */
export interface SessionHost {
  interact(name: string, data: unknown): void;
  /** Register a battler as an RPGJS spritesheet. */
  registerSheet(info: BattlerInfo): void;
  /** An RPGJS spritesheet registered in the engine (`spritesheets: [...]`). */
  getSheet(id: string): BattleSpritesheet | undefined | Promise<BattleSpritesheet | undefined>;
  /** Hide the map HUDs while fighting; returns a restore function. */
  hideOtherGuis(): () => void;
  /** Battle music (engine.music.enter / leave); returns a restore function. */
  music(bgm: string | undefined): () => void;
  /** Client hooks `turnBattle.<name>` (option, then game modules). */
  callHooks<K extends keyof TurnBattleClientHooks & string>(name: K, ...args: BattleHookArgs<TurnBattleClientHooks, K>): Promise<unknown[]>;
}

export interface SessionOptions {
  /** Battle hints per spritesheet id (override the spritesheet's `battle` field). */
  battlers?: Record<string, BattlerHints>;
  /** Battle backgrounds by id (troop `background`); `default` is used otherwise. */
  backdrops?: Record<string, Backdrop>;
  /** Builds the background of a troop that `backdrops` does not hold (for instance an image of the project). */
  resolveBackdrop?: (id: string) => Backdrop | undefined | Promise<Backdrop | undefined>;
  fx?: Record<string, FxFn>;
}

interface Targeting {
  command: (target?: string) => Command;
  scope: TargetScope;
  ids: string[];
  index: number;
  multi: boolean;
}

let host: SessionHost;
let options: SessionOptions;
let current: {
  id: string;
  director: Director;
  revision: number;
  queue: BattlePacket[];
  latest: BattleView;
  pumping: boolean;
  /** Coop turn timer (seconds). */
  turnTimer?: number;
  ready: Promise<void>;
  restore: (() => void)[];
} | null = null;
let targeting: Targeting | null = null;
let endCinematic: (() => void) | null = null;

export function configureSession(h: SessionHost, o: SessionOptions) {
  host = h;
  options = o;
  preload(o);
}

export const inBattle = () => current !== null;

/** Called with every GUI data update (packets arrive through gui.open / gui.update). */
export function receive(packet: BattlePacket | null | undefined) {
  if (!packet?.battleId) return;
  if (!current || current.id !== packet.battleId) {
    if (current) teardown();
    open(packet);
  }
  const s = current!;
  if (packet.players) players.set(packet.players);
  audience.set(packet.spectators ?? 0);
  if (packet.error) {
    showToast(t(packet.error));
    if (phase() === "playing" && !s.pumping && s.latest.actor) nextTurn();
    return;
  }
  if (packet.revision <= s.revision) return;
  s.revision = packet.revision;
  s.queue.push(packet);
  void pump();
}

async function backdropFor(view: BattleView): Promise<Backdrop | null> {
  const b = options.backdrops ?? {};
  const known = view.background ? b[view.background] : undefined;
  if (known) return known;
  const resolved = view.background
    ? await Promise.resolve(options.resolveBackdrop?.(view.background)).catch(() => undefined)
    : undefined;
  return resolved ?? b.default ?? null;
}

/** Moves `entering` to `to` in `ms`, on the frames of the page (the battle scene does not tick yet while it loads). */
let enteringTween = 0;
function fadeEntering(to: number, ms: number) {
  cancelAnimationFrame(enteringTween);
  const from = entering();
  if (ms <= 0 || scene.reduced) return void entering.set(to);
  const start = performance.now();
  const step = (now: number) => {
    const k = Math.min(1, (now - start) / ms);
    entering.set(from + (to - from) * k);
    if (k < 1) enteringTween = requestAnimationFrame(step);
  };
  enteringTween = requestAnimationFrame(step);
}

function open(packet: BattlePacket) {
  const display = structuredClone(packet.state);
  const director = new Director(scene, display, {
    fx: options.fx ?? {},
    cinematic: playCinematic,
    // The music of the battle makes way for the one of the victory (both are left with the battle).
    victoryMusic: () => {
      if (!display.victoryBgm) return false;
      current?.restore.push(host.music(display.victoryBgm));
      return true;
    },
    beat: async (beat: Beat, steps) => !(await host.callHooks("onPlay", beat, scene, steps)).includes(false),
  });
  const intro = packet.beats.find((b) => b.t === "intro");
  result.set(null);
  banner.set(null);
  cutin.set(null);
  order.set([]);
  phase.set("loading");
  fadeEntering(1, 350);
  viewer.set(packet.viewer ?? "");
  players.set(packet.players ?? {});
  spectating.set(!!packet.spectator);
  pvp.set(!!packet.pvp);
  surrenderArmed.set(false);
  surrendered.set(false);
  scene.reduced = reduced();
  scene.clock.speed = speed();
  // Summonable creatures are loaded up front: they appear mid-battle.
  const summons = Object.values(display.catalog.summons ?? {}).map((s) => s.battler);
  const ids = [...new Set([...display.combatants.map((c) => c.battler), ...summons])];
  const ready = Promise.all(
    ids.map(async (id) => {
      const info = await battler(id).catch((error) => {
        // A summon without spritesheet only fails when it is summoned.
        if (summons.includes(id) && !display.combatants.some((c) => c.battler === id)) return null;
        // A battler that cannot be loaded never blocks the battle: it is drawn invisible, the rest plays.
        console.error(`[TurnBattle] battler "${id}" could not be loaded`, error);
        return placeholderBattler(id);
      });
      return info ? ([id, info] as const) : null;
    }),
  ).then(async (list) => {
    const entries = list.filter((e): e is readonly [string, BattlerInfo] => !!e);
    const backdrop = await backdropFor(display);
    if (current?.id !== packet.battleId) return;
    scene.start(display, new Map(entries), backdrop);
    // The battle fades in on the dark map, with the flash and the burst of its intro
    fadeEntering(0, 420);
    if (intro) director.applySnap(intro.snap);
    else {
      // Joining a running battle (spectator): no intro, show the scene and the turn order now.
      scene.reveal.set(1);
      order.set(chips(display, previewTimeline(display, 10)));
    }
    void host.callHooks("onStart", scene, display);
  });
  current = {
    id: packet.battleId,
    director,
    revision: -1,
    queue: [],
    latest: packet.state,
    pumping: false,
    turnTimer: packet.turnTimer,
    ready,
    restore: [host.hideOtherGuis(), host.music(display.bgm)],
  };
  publish(display);
}

async function pump() {
  const s = current;
  if (!s || s.pumping) return;
  s.pumping = true;
  try {
    await s.ready;
    while (s.queue.length && current === s) {
      const packet = s.queue.shift()!;
      phase.set("playing");
      actorId.set(null);
      waitingFor.set(null);
      stopCountdown();
      try {
        for (const beat of packet.beats) {
          if (current !== s) return;
          await s.director.play(beat);
        }
      } catch (error) {
        // A beat that cannot be played (an effect of the game that fails…) is skipped: the screen takes the state of the
        // server and the battle goes on.
        console.error("[TurnBattle] playback failed", error);
        showToast(t("turnBattle.error.playback"));
        // What the beat still ran besides (its other animations) ends now, so that nothing moves a battler once it is back home.
        for (let i = 0; i < 20 && scene.clock.busy; i++) {
          scene.clock.flush();
          await new Promise((resolve) => setTimeout(resolve, 0));
        }
        // The battle may have closed meanwhile (or another opened): the scene is no longer this one's.
        if (current !== s) return;
        // The battlers and the numbers of the server, each back home: nothing stays where the animation stopped.
        s.director.resync(packet.state);
      }
      s.latest = packet.state;
      s.director.display = structuredClone(packet.state);
      publish(s.director.display);
    }
    if (current !== s) return;
    if (s.latest.result) phase.set("result");
    else if (s.latest.actor) nextTurn();
  } catch (error) {
    console.error("[TurnBattle] playback failed", error);
    showToast(t("turnBattle.error.playback"));
  } finally {
    s.pumping = false;
  }
}

/** Limit video through the RPGJS cinematic component (skip, music ducking, autoplay recovery). */
function playCinematic(src: string): Promise<void> {
  return new Promise((resolve) => {
    endCinematic = () => {
      endCinematic = null;
      cinematic.set(null);
      resolve();
    };
    cinematic.set({ src, allowSkip: true, bgm: "duck" });
  });
}

export function onCinematicEnd() {
  endCinematic?.();
}

// ---------------------------------------------------------------- commands

const hero = (): Combatant | undefined =>
  current?.latest.combatants.find((c) => c.id === current?.latest.actor);

/** A hero must decide: open the menu if it is ours, otherwise wait for its player (coop). */
function nextTurn() {
  const h = hero();
  if (!h || !current) return;
  const me = viewer();
  if (!spectating() && (!h.owner || !me || h.owner === me)) return enterCommand();
  targeting = null;
  scene.setTargets([]);
  scene.setActive(h.id);
  actorId.set(h.id);
  waitingFor.set({ unit: h.name, player: (h.owner && players()[h.owner]) || "" });
  phase.set("waiting");
  startCountdown();
}

let ticking: ReturnType<typeof setInterval> | undefined;
let countdownRevision = -1;
/** Local display of the coop turn timer (the server enforces it), once per turn. */
function startCountdown() {
  const total = current?.turnTimer;
  if (!total || !current || countdownRevision === current.latest.revision) return;
  stopCountdown();
  countdownRevision = current.latest.revision;
  const end = performance.now() + total * 1000;
  countdown.set(total);
  ticking = setInterval(() => {
    const left = Math.max(0, Math.ceil((end - performance.now()) / 1000));
    countdown.set(left);
    if (left === 0) stopCountdown(false);
  }, 250);
}
function stopCountdown(clear = true) {
  clearInterval(ticking);
  ticking = undefined;
  if (clear) countdown.set(null);
}

function enterCommand() {
  const h = hero();
  if (!h || !current) return;
  waitingFor.set(null);
  startCountdown();
  actorId.set(h.id);
  targeting = null;
  scene.setTargets([]);
  scene.setActive(h.id);
  targetName.set("");
  targetInfo.set(null);
  phase.set("command");
  openMenu("root");
}

/** The SP cost of a menu entry, as the hint shows it ("18 MP"). */
const spCost = (cost: number) => t("turnBattle.spCost", { cost });

function rootEntries(h: Combatant, view: BattleView): MenuEntry[] {
  const limitSkill = h.limit ? view.catalog.skills[h.limit.skill] : undefined;
  const entries: MenuEntry[] = [];
  if (h.limit && h.limit.value >= h.limit.max && limitSkill && !forbids(view, "limit"))
    entries.push({ id: "limit", label: limitSkill.name, icon: "✦", special: true, hint: t("turnBattle.limitReady"), detail: limitSkill.description });
  // Custom commands ("Steal", "Scan"…) come right after the skills.
  const custom: MenuEntry[] = commandsOf(h, view, false).map((c) => commandEntry(c, h, view, spCost));
  entries.push(
    { id: "attack", label: t("turnBattle.attack"), icon: "⚔", detail: t("turnBattle.attackHint"), disabled: forbids(view, "attack") },
    { id: "skills", label: t("turnBattle.skills"), icon: "✧", disabled: (h.skills.length === 0 && commandsOf(h, view, true).length === 0) || forbids(view, "skill") },
    ...custom,
    { id: "guard", label: t("turnBattle.guard"), icon: "⛨", detail: t("turnBattle.guardHint"), disabled: forbids(view, "guard") },
    { id: "items", label: t("turnBattle.items"), icon: "⚗", disabled: forbids(view, "item") || !Object.values(bagOf(view, h)).some((n) => n > 0) },
    // PvP: no escape, but the player may give up.
    pvp()
      ? { id: "surrender", label: surrenderArmed() ? t("turnBattle.surrenderConfirm") : t("turnBattle.surrender"), icon: "⚑", detail: t("turnBattle.surrenderHint") }
      : { id: "escape", label: t("turnBattle.escape"), icon: "➶", disabled: !view.canEscape, detail: t("turnBattle.escapeHint") },
  );
  return entries;
}

function openMenu(level: "root" | "skills" | "items" | "options") {
  const h = hero();
  if (!h || !current) return;
  const view = current.latest;
  menuLevel.set(level);
  menuIndex.set(0);
  if (level === "root") {
    menuTitle.set(h.name);
    menuEntries.set(rootEntries(h, view));
  } else if (level === "options") {
    // Sub-menu of a custom command (e.g. which creature to summon).
    const info = view.catalog.commands![menuCommand()!];
    menuTitle.set(info.label);
    menuEntries.set(
      (info.options ?? []).map((o) => {
        const cost = o.spCost ?? info.spCost ?? 0;
        return {
          id: o.id,
          label: o.label,
          icon: o.icon,
          hint: cost ? spCost(cost) : undefined,
          cost,
          detail: o.description,
          disabled: cost > h.sp || !!view.blocked?.includes(`${info.id}:${o.id}`),
        };
      }),
    );
  } else if (level === "skills") {
    menuTitle.set(t("turnBattle.skills"));
    menuEntries.set([
      ...h.skills.map((id) => {
        const s = view.catalog.skills[id];
        return { id, label: s.name, hint: spCost(s.spCost ?? 0), cost: s.spCost ?? 0, detail: s.description, disabled: (s.spCost ?? 0) > h.sp };
      }),
      // The skills that do several things, recharge… are commands listed here
      ...commandsOf(h, view, true).map((c) => commandEntry(c, h, view, spCost)),
    ]);
  } else {
    menuTitle.set(t("turnBattle.items"));
    menuEntries.set(
      Object.entries(bagOf(view, h))
        .filter(([, n]) => n > 0)
        .map(([id, n]) => {
          const it = view.catalog.items[id];
          return { id, label: it.name, hint: t("turnBattle.quantity", { count: n }), detail: it.description };
        }),
    );
  }
  // The first entry that can be used: confirming at once does something.
  focusEntry(Math.max(0, menuEntries().findIndex((e) => !e.disabled)));
}

/** Highlight an entry and preview its effect on the turn order. */
export function focusEntry(index: number) {
  const entries = menuEntries();
  if (!entries.length || !current) return;
  const i = (index + entries.length) % entries.length;
  menuIndex.set(i);
  const e = entries[i];
  const view = current.latest;
  const weights = view.weights ?? DEFAULT_WEIGHTS;
  const level = menuLevel();
  let weight: number | undefined;
  if (e.id.startsWith("cmd:")) weight = view.catalog.commands?.[e.id.slice(4)]?.weight ?? weights.custom;
  else if (level === "skills") weight = view.catalog.skills[e.id]?.weight ?? weights.skill;
  else if (level === "items") weight = weights.item;
  else if (level === "options") weight = view.catalog.commands?.[menuCommand() ?? ""]?.weight ?? weights.custom;
  else if (e.id in weights) weight = weights[e.id as keyof typeof weights];
  else if (e.id === "skills") weight = weights.skill;
  else if (e.id.startsWith("cmd:")) weight = view.catalog.commands?.[e.id.slice(4)]?.weight ?? weights.custom;
  else if (e.id === "items") weight = weights.item;
  if (weight === undefined) return;
  const ids = previewTimeline(view, 10, { weight });
  order.set(chips(view, ids, ids.indexOf(view.actor!, 1)));
  previewing.set(true);
}

/** The entry `delta` steps away that can be used, over the greyed ones (or the next one when none can be used). */
function usableFrom(index: number, delta: number) {
  const entries = menuEntries();
  const n = entries.length;
  for (let step = 1; step <= n; step++) {
    const i = (((index + delta * step) % n) + n) % n;
    if (!entries[i]?.disabled) return i;
  }
  return index + delta;
}

export function moveMenu(delta: number) {
  if (phase() === "target") return moveTarget(delta);
  if (phase() !== "command") return;
  sfx("cursor");
  focusEntry(usableFrom(menuIndex(), delta));
}

export function confirm() {
  if (phase() === "target") return confirmTarget();
  if (phase() === "result") return close();
  if (phase() !== "command") return;
  chooseEntry(menuIndex());
}

export function chooseEntry(index: number) {
  const h = hero();
  if (!h || !current || phase() !== "command") return;
  const e = menuEntries()[index];
  if (!e) return;
  if (e.disabled) {
    sfx("back");
    if (e.id.startsWith("cmd:") || menuLevel() === "options")
      return showToast((e.cost ?? 0) > h.sp ? t("turnBattle.error.noSp") : t("turnBattle.error.unavailable"));
    return showToast(e.cost !== undefined && menuLevel() === "skills" ? t("turnBattle.error.noSp") : t("turnBattle.error.unavailable"));
  }
  sfx("confirm");
  menuIndex.set(index);
  const view = current.latest;
  const level = menuLevel();
  if ((level === "root" || level === "skills") && e.id.startsWith("cmd:")) {
    const info = view.catalog.commands![e.id.slice(4)];
    if (info.options?.length) {
      menuCommand.set(info.id);
      return openMenu("options");
    }
    return startTargeting(info.scope, (target) => ({ type: "custom", command: info.id, target }));
  }
  if (level === "options") {
    const info = view.catalog.commands![menuCommand()!];
    const option = info.options!.find((o) => o.id === e.id)!;
    return startTargeting(option.scope ?? info.scope, (target) => ({ type: "custom", command: info.id, option: option.id, target }));
  }
  if (level === "root") {
    switch (e.id) {
      case "attack":
        return startTargeting("enemy", (target) => ({ type: "attack", target: target! }));
      case "skills":
        return openMenu("skills");
      case "items":
        return openMenu("items");
      case "guard":
        return send({ type: "guard" });
      case "escape":
        return send({ type: "escape" });
      case "surrender":
        return surrender();
      case "limit": {
        const skill = view.catalog.skills[h.limit!.skill];
        if (!skill) return showToast(t("turnBattle.error.unknownSkill"));
        return startTargeting(skill.scope, (target) => ({ type: "limit", target }));
      }
    }
  }
  if (level === "skills") {
    const skill = view.catalog.skills[e.id];
    return startTargeting(skill.scope, (target) => ({ type: "skill", skill: e.id, target }));
  }
  const item = view.catalog.items[e.id];
  return startTargeting(item.scope, (target) => ({ type: "item", item: e.id, target }));
}

let disarm: ReturnType<typeof setTimeout> | undefined;

/** Keep the menu entry label in sync ("Surrender" / "Confirm surrender?"). */
function refreshSurrenderEntry() {
  if (menuLevel() !== "root" || (phase() !== "command" && phase() !== "target")) return;
  const label = surrenderArmed() ? t("turnBattle.surrenderConfirm") : t("turnBattle.surrender");
  menuEntries.set(menuEntries().map((e) => (e.id === "surrender" ? { ...e, label } : e)));
}
/**
 * PvP "Surrender" (menu entry or button, at any time): a first press arms it,
 * a second one within 4 s gives up. The server ends the duel (forfeit).
 */
export function surrender() {
  if (!current || !pvp() || spectating() || surrendered() || current.latest.result) return;
  if (!surrenderArmed()) {
    sfx("cursor");
    surrenderArmed.set(true);
    refreshSurrenderEntry();
    clearTimeout(disarm);
    disarm = setTimeout(() => {
      surrenderArmed.set(false);
      refreshSurrenderEntry();
    }, 4000);
    return;
  }
  clearTimeout(disarm);
  sfx("confirm");
  surrenderArmed.set(false);
  surrendered.set(true);
  host.interact("surrender", {});
}

/** Spectator: stop watching (Escape or the "Quitter" button). */
export function leaveWatching() {
  if (!current || !spectating()) return;
  sfx("back");
  teardown();
  host.interact("close", {});
}

export function back() {
  if (spectating() && phase() !== "result") return leaveWatching();
  if (phase() === "target" || (phase() === "command" && menuLevel() !== "root")) sfx("back");
  if (phase() === "target") {
    targeting = null;
    scene.setTargets([]);
    targetName.set("");
    targetInfo.set(null);
    phase.set("command");
    return focusEntry(menuIndex());
  }
  if (phase() === "command" && menuLevel() !== "root") {
    const level = menuLevel();
    const from = level === "options" ? `cmd:${menuCommand()}` : level;
    openMenu("root");
    const idx = menuEntries().findIndex((e) => e.id === from);
    if (idx >= 0) focusEntry(idx);
  }
}

function startTargeting(scope: TargetScope, command: (target?: string) => Command) {
  const h = hero();
  if (!h || !current) return;
  const list = candidates(current.latest, h, scope);
  if (!list.length) return showToast(t("turnBattle.error.noTarget"));
  if (scope === "self") return send(command(h.id));
  const multi = isMultiTarget(scope);
  // Default target: first foe still standing, or the most wounded friend.
  let index = 0;
  if (scope === "ally")
    index = list.reduce((best, c, i) => (c.hp / c.stats.maxHp < list[best].hp / list[best].stats.maxHp ? i : best), 0);
  targeting = { scope, command, ids: list.map((c) => c.id), index, multi };
  phase.set("target");
  refreshTargets();
}

function refreshTargets() {
  if (!targeting || !current) return;
  const ids = targeting.multi ? targeting.ids : [targeting.ids[targeting.index]];
  scene.setTargets(ids);
  const target = targeting.multi ? undefined : current.latest.combatants.find((c) => c.id === ids[0]);
  targetName.set(targeting.multi ? t("turnBattle.allTargets") : target?.name ?? "");
  targetInfo.set(target ? targetInfoOf(target, hero()) : null);
}

function moveTarget(delta: number) {
  if (!targeting || targeting.multi) return;
  sfx("cursor");
  targeting.index = (targeting.index + delta + targeting.ids.length) % targeting.ids.length;
  refreshTargets();
}

function confirmTarget() {
  if (!targeting) return;
  sfx("confirm");
  send(targeting.command(targeting.multi ? undefined : targeting.ids[targeting.index]));
}

/** Pointer on a battler (from the battler component). */
export function pick(id: string) {
  if (phase() === "target" && targeting) {
    const i = targeting.ids.indexOf(id);
    if (i < 0) return;
    if (!targeting.multi && targeting.index !== i) {
      targeting.index = i;
      refreshTargets();
    }
    return confirmTarget();
  }
  if (phase() === "command" && menuLevel() === "root") {
    // Clicking a foe directly = attack it.
    const h = hero();
    const foe = current?.latest.combatants.find((c) => c.id === id);
    if (h && foe && foe.side !== h.side && foe.hp > 0) send({ type: "attack", target: id });
  }
}

export function hover(id: string | null) {
  if (phase() !== "target" || !targeting || targeting.multi || !id) return;
  const i = targeting.ids.indexOf(id);
  if (i >= 0 && i !== targeting.index) {
    targeting.index = i;
    refreshTargets();
  }
}

function send(command: Command) {
  const h = hero();
  if (!h || !current) return;
  targeting = null;
  scene.setTargets([]);
  targetName.set("");
  targetInfo.set(null);
  previewing.set(false);
  phase.set("playing");
  actorId.set(null);
  stopCountdown();
  host.interact("command", { revision: current.latest.revision, actor: h.id, command });
}

// ---------------------------------------------------------------- misc

export function skipCutin() {
  current?.director.skip();
}

export function cycleSpeed() {
  const next = speed() === 1 ? 2 : speed() === 2 ? 3 : 1;
  speed.set(next);
  scene.clock.speed = next;
}

export function toggleMuted() {
  muted.set(!muted());
  setMuted(muted());
}

export function toggleReduced() {
  reduced.set(!reduced());
  scene.reduced = reduced();
}

/** Result screen confirmed: fade out and give control back to the map. */
export async function close() {
  const s = current;
  if (!s || phase() !== "result") return;
  const outcome = s.latest.result as BattleResult;
  phase.set("closed");
  result.set(null);
  await scene.clock.tween(420, (k) => scene.reveal.set(1 - k));
  teardown();
  void host.callHooks("onEnd", outcome);
  host.interact("close", {});
}

export function teardown() {
  if (!current) return;
  current.restore.forEach((restore) => restore());
  Director.clearLoops();
  Director.stopCounters();
  fadeEntering(0, 0);
  scene.stop();
  scene.fade.set(0);
  current = null;
  targeting = null;
  endCinematic?.();
  phase.set("closed");
  partyIds.set([]);
  foeIds.set([]);
  order.set([]);
  banner.set(null);
  cutin.set(null);
  actorId.set(null);
  waitingFor.set(null);
  stopCountdown();
  countdownRevision = -1;
  players.set({});
  spectating.set(false);
  audience.set(0);
  pvp.set(false);
  surrenderArmed.set(false);
  surrendered.set(false);
  clearTimeout(disarm);
  viewer.set("");
}

/**
 * A battler from its RPGJS spritesheet: read once, registered as the battle
 * spritesheet (held poses added), portrait prepared for the HUD.
 */
async function battler(id: string): Promise<BattlerInfo> {
  const sheet = await host.getSheet(id);
  if (!sheet) throw new Error(`[TurnBattle] No RPGJS spritesheet "${id}" (register it with spritesheets: [...])`);
  const b = await loadBattler(id, sheet, options.battlers?.[id]);
  host.registerSheet(b);
  if (!faces()[id]) {
    const idle = (b.anims.get("idle") ?? b.anims.values().next().value!).frames[0];
    faces.set({
      ...faces(),
      [id]: {
        url: b.image,
        cols: b.columns,
        rows: b.rows,
        cw: b.cell.width,
        ch: b.cell.height,
        x: b.face.x,
        y: b.face.y,
        size: b.face.size,
        col: idle.x,
        row: idle.y,
        flip: (b.hints.facing ?? "left") === "right",
      },
    });
  }
  return b;
}

/** Warm up the battlers named in the options (portraits ready before the first battle). */
function preload(o: SessionOptions) {
  for (const id of Object.keys(o.battlers ?? {}))
    battler(id).catch((error) => console.warn(`[TurnBattle] battler "${id}" failed to load`, error));
}
