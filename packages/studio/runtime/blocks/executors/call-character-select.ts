import { getGraphicKey, getGraphicScale } from "../../../src/graphic-key";
import { normalizeRuntimeHitbox } from "../../../src/runtime-hitbox";
import { excludeTriggers } from '../context-helpers';
import type { BlockExecutor } from '../types';

type StudioDatabaseRecord = Record<string, unknown> & {
  id: string;
  _type?: unknown;
  type?: unknown;
  resourceType?: unknown;
  classId?: unknown;
  class?: unknown;
  animations?: unknown;
  params?: unknown;
};

const recordType = (record: unknown): unknown => {
  if ((typeof record !== 'object' && typeof record !== 'function') || record === null) return undefined;
  const candidate = record as Record<string, unknown>;
  return candidate['_type'] ?? candidate['type'] ?? candidate['resourceType'];
};

const currentActorId = (player: any): string | undefined => {
  const value = player.studioSelectedActorId;
  const resolved = typeof value === 'function' ? value() : value;
  return typeof resolved === 'string' && resolved.length > 0 ? resolved : undefined;
};

const persistActorId = (player: any, actorId: string): void => {
  const value = player.studioSelectedActorId;
  if (value && typeof value.set === 'function') value.set(actorId);
  else player.studioSelectedActorId = actorId;
};

export const schemaCallCharacterSelect = {
  type: 'call_character_select',
  label: 'block.call character select.label',
  description: 'block.call character select.description',
  category: 'character',
  icon: '🧙',
  requiredCapabilities: ['player', 'map', 'ui'],
  contextCondition: excludeTriggers('onInit'),
  schema: {
    type: 'object',
    properties: {
      allActors: {
        type: 'boolean',
        title: 'block.call character select.all actors',
        default: true,
      },
      actorIds: {
        type: 'array',
        title: 'block.call character select.actors',
        uniqueItems: true,
        default: [],
        items: {
          type: 'string',
          title: 'block.call character select.actor',
          $ref: '#/functions/actor',
        },
      },
      allowCancel: {
        type: 'boolean',
        title: 'block.call character select.allow cancel',
        default: false,
      },
    },
    allOf: [{
      if: { properties: { allActors: { const: false } } },
      then: { properties: { actorIds: { minItems: 1 } }, required: ['actorIds'] },
    }],
    required: ['allActors', 'allowCancel'],
  },
} as const;

export const call_character_select: BlockExecutor<'call_character_select'> = async (context, params) => {
  const player = context.player as any;
  if (typeof player.showCharacterSelect !== 'function' || typeof player.changeActor !== 'function') {
    console.warn('[StudioBlocks] call_character_select requires an RPGJS version exposing showCharacterSelect() and changeActor()');
    return;
  }

  const map = context.map ?? player.getCurrentMap?.();
  const database = map?.database?.() as Record<string, StudioDatabaseRecord> | undefined;
  if (!database) {
    console.warn('[StudioBlocks] character selector requires a loaded map database');
    return;
  }

  const actorsById = new Map<string, StudioDatabaseRecord>(
    Object.entries(database)
      .filter(([, record]) => record && recordType(record) === 'actor')
      .map(([id, record]): [string, StudioDatabaseRecord] => [id, { ...record, id }]),
  );
  const offeredActors = params.allActors
    ? Array.from(actorsById.values())
    : Array.from(new Set(params.actorIds ?? []))
      .flatMap((id) => actorsById.get(id) ? [actorsById.get(id)!] : []);
  if (offeredActors.length === 0) {
    console.warn('[StudioBlocks] character selector has no valid actors');
    return;
  }

  const presentationActors = offeredActors.map((actor) => {
    const classRecord = typeof actor.classId === 'string' ? database[actor.classId] : actor.class;
    const resolvedClass = classRecord && recordType(classRecord) === 'class' ? classRecord : undefined;
    return {
      ...actor,
      graphic: getGraphicKey(actor.graphic) ?? undefined,
      hitbox: normalizeRuntimeHitbox(actor.hitbox),
      class: resolvedClass,
    };
  });
  const selected = await player.showCharacterSelect(presentationActors, {
    selectedActorId: currentActorId(player),
    allowCancel: params.allowCancel,
  });
  const selectedId = selected?.id ?? selected?._id;
  if (typeof selectedId !== 'string') return;

  const actor = presentationActors.find((candidate) => candidate.id === selectedId);
  if (!actor) return;
  player.changeActor(actor);
  player._graphicScale?.set(getGraphicScale(actor.params, actor) ?? null);
  player.studioCombatAnimations = actor.animations ?? {};
  player.combatAnimations = actor.animations ?? {};
  persistActorId(player, actor.id);
};
