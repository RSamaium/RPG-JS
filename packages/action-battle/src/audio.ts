import type {
  ActionBattleAudioCue,
  ActionBattleAudioCueInput,
  ActionBattleAudioOptions,
  ActionBattleVisualContext,
} from "./types";

export const ACTION_BATTLE_COMBAT_AUDIO_ID = "action-battle.combat-audio";

export interface ActionBattleThreat {
  enemyId: string;
  music?: string;
  priority: number;
  order: number;
}

const cueTimes = new WeakMap<object, Map<string, number>>();
const localAttackTimes = new WeakMap<object, { at: number; entityId?: string }>();
const lethalCueTimes = new WeakMap<object, number>();

const resolveCue = (
  input: ActionBattleAudioCueInput | undefined,
  context: ActionBattleVisualContext,
): ActionBattleAudioCue | undefined => {
  const value = typeof input === "function" ? input(context) : input;
  if (!value) return undefined;
  if (typeof value === "string" || Array.isArray(value)) return { id: value };
  return value;
};

const selectCueId = (cue: ActionBattleAudioCue): string | undefined => {
  const ids = Array.isArray(cue.id) ? cue.id : [cue.id];
  const available = ids.filter((id) => typeof id === "string" && id.length > 0);
  if (available.length === 0) return undefined;
  return available[Math.floor(Math.random() * available.length)];
};

export const playActionBattleAudioCue = (
  engine: any,
  input: ActionBattleAudioCueInput | undefined,
  context: ActionBattleVisualContext,
) => {
  if (!engine || !input) return;
  const cue = resolveCue(input, context);
  if (!cue) return;
  const id = selectCueId(cue);
  if (!id) return;
  const cooldownMs = Math.max(0, cue.cooldownMs ?? 80);
  const now = Date.now();
  let times = cueTimes.get(engine);
  if (!times) {
    times = new Map();
    cueTimes.set(engine, times);
  }
  if (now - (times.get(id) ?? 0) < cooldownMs) return;
  times.set(id, now);
  void engine.playSound?.(id, { volume: cue.volume ?? 1 });
};

export const playLocalActionBattleAttackAudio = (
  engine: any,
  options: ActionBattleAudioOptions | false | undefined,
  context: ActionBattleVisualContext,
) => {
  if (!engine || !options) return;
  localAttackTimes.set(engine, {
    at: Date.now(),
    entityId: context.entity?.id,
  });
  playActionBattleAudioCue(engine, options.attack, context);
};

export const playActionBattleMomentAudio = (
  engine: any,
  options: ActionBattleAudioOptions | false | undefined,
  context: ActionBattleVisualContext,
) => {
  if (!engine || !options) return;
  switch (context.moment) {
    case "attack":
      {
        const predicted = localAttackTimes.get(engine);
        if (
          predicted &&
          Date.now() - predicted.at < 250 &&
          (!predicted.entityId || predicted.entityId === context.entity?.id)
        ) {
          return;
        }
      }
      playActionBattleAudioCue(engine, options.attack, context);
      return;
    case "castSkill":
      playActionBattleAudioCue(engine, context.skill?.sound ?? options.skill, context);
      return;
    case "hit":
      playActionBattleAudioCue(engine, options.hit, context);
      return;
    case "hurt":
      playActionBattleAudioCue(engine, options.hit, context);
      if (context.defeated || context.result?.defeated) {
        lethalCueTimes.set(engine, Date.now());
        playActionBattleAudioCue(engine, options.die, context);
      } else {
        playActionBattleAudioCue(engine, options.hurt, context);
      }
      return;
    case "defeat":
      if (Date.now() - (lethalCueTimes.get(engine) ?? 0) < 750) return;
      playActionBattleAudioCue(engine, options.die, context);
      return;
  }
};

const chooseThreat = (
  threats: ActionBattleThreat[],
  currentId?: string,
): ActionBattleThreat | undefined =>
  [...threats].sort((left, right) => {
    const priority = right.priority - left.priority;
    if (priority !== 0) return priority;
    if (left.enemyId === currentId) return -1;
    if (right.enemyId === currentId) return 1;
    return left.order - right.order;
  })[0];

export const createActionBattleCombatAudioVisual = (
  options: ActionBattleAudioOptions | false | undefined,
) => (context: any) => {
  if (!options) return;
  const threats = Array.isArray(context.data?.threats)
    ? context.data.threats as ActionBattleThreat[]
    : [];
  const engine = context.engine;
  const music = options.music;
  if (!engine?.music || music === false) return;
  if (threats.length === 0) {
    engine.music.contextId = undefined;
    engine.music.leave(typeof music === "object" ? music : undefined);
    return;
  }
  const selected = chooseThreat(threats, engine.music.contextId);
  const mapMusic = engine.sceneMap?.data?.()?.params?.combatMusic;
  const configured = typeof music === "object" ? music : {};
  const projectMusic =
    typeof configured.battle === "function"
      ? configured.battle(context)
      : configured.battle;
  const battle = selected?.music ?? mapMusic ?? projectMusic;
  engine.music.contextId = selected?.enemyId;
  void engine.music.enter(battle, configured);
};

type ThreatTarget = {
  clientVisual?: (id: string, data: unknown) => unknown;
};

type ThreatEntry = ActionBattleThreat & { enemy: object };
const threatsByTarget = new WeakMap<object, Map<object, ThreatEntry>>();
let threatOrder = 0;

const emitThreats = (target: ThreatTarget) => {
  const entries = threatsByTarget.get(target as object);
  target.clientVisual?.(ACTION_BATTLE_COMBAT_AUDIO_ID, {
    threats: entries
      ? [...entries.values()].map(({ enemy: _enemy, ...entry }) => entry)
      : [],
  });
};

export const updateActionBattleThreat = (
  enemy: object,
  target: ThreatTarget | null | undefined,
  active: boolean,
  input: { enemyId?: string; music?: string; priority?: number; boss?: boolean },
) => {
  if (!target || typeof target !== "object" || !target.clientVisual) return;
  let entries = threatsByTarget.get(target);
  if (!entries) {
    entries = new Map();
    threatsByTarget.set(target, entries);
  }
  if (active) {
    const previous = entries.get(enemy);
    entries.set(enemy, {
      enemy,
      enemyId: input.enemyId ?? `enemy-${++threatOrder}`,
      music: input.music,
      priority: input.priority ?? (input.boss ? 100 : 0),
      order: previous?.order ?? ++threatOrder,
    });
  } else {
    entries.delete(enemy);
  }
  emitThreats(target);
};
