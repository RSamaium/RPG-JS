import type { BlockDefinition, BlockExecutor, LaunchProjectileParams } from '../types';
import { getEvent } from './utils';
import {
  playStudioVisualEffect,
  resolveVisualEffect,
  visualEffectCastPart,
  visualEffectFacing,
  visualEffectPoint,
  type VisualEffectAnchor,
} from '../../visual-effects';
import { isStudioProjectileRecord, studioProjectileOptions } from '../../projectile';

const eventField = (title: string, description: string) => ({
  type: 'string',
  title,
  description,
  format: {
    name: 'map-position',
    displayMode: 'single-map',
    selectionMode: 'event',
    returnType: 'eventId'
  }
}) as const;

export const schemaLaunchProjectile: BlockDefinition<'launch_projectile'> = {
  type: 'launch_projectile',
  label: 'Launch a projectile',
  description: 'Launch a projectile of the database (an arrow, a bomb, a laser...) from the player or an event, the way it faces or toward a target',
  category: 'scene',
  icon: '🏹',
  requiredCapabilities: ['player', 'map'],
  schema: {
    type: 'object',
    properties: {
      projectile: {
        type: 'string',
        title: 'Projectile',
        description: 'Select a projectile from the database',
        $ref: '#/functions/projectile'
      },
      source: {
        type: 'string',
        title: 'From',
        enum: ['event', 'player'],
        default: 'event',
        format: {
          radio: true,
          horizontal: true,
          labels: ['This event', 'Player']
        }
      },
      target: {
        type: 'string',
        title: 'Toward',
        description: 'Where it goes: the way the launcher faces, the player, an event or a position',
        enum: ['facing', 'player', 'event', 'position'],
        default: 'facing',
        format: {
          radio: true,
          horizontal: true,
          labels: ['Where it faces', 'Player', 'Event', 'Map Position']
        }
      },
      targetEventId: eventField('Target event', 'The event it goes to'),
      targetPosition: {
        type: 'object',
        title: 'Target position',
        description: 'The position it goes to',
        properties: { x: { type: 'number' }, y: { type: 'number' } },
        format: {
          name: 'map-position',
          displayMode: 'single-map',
          selectionMode: 'position',
          returnType: 'position'
        }
      },
      damage: {
        type: 'number',
        title: 'Damage to the player',
        description: 'HP the player loses when it is hit (0: none). Events hit react with their page "Hit by a projectile".',
        minimum: 0,
        default: 0
      }
    },
    allOf: [
      { if: { properties: { target: { const: 'event' } } }, then: { required: ['targetEventId'] } },
      { if: { properties: { target: { const: 'position' } } }, then: { required: ['targetPosition'] } }
    ],
    required: ['projectile', 'source']
  }
};

type Context = Parameters<BlockExecutor<'launch_projectile'>>[0];

const targetOf = (context: Context, params: LaunchProjectileParams): VisualEffectAnchor | undefined => {
  if (params.target === 'player') return context.player ?? undefined;
  if (params.target === 'event') return getEvent(context, { eventId: params.targetEventId }) as VisualEffectAnchor | undefined;
  if (params.target === 'position') return params.targetPosition;
  return undefined;
};

/**
 * Launches a Projectile of the database with the projectiles of the engine (`map.projectiles.emit`): its type is the
 * id of the record, so the client draws it with the look the Studio registered for it. It hits the player (who loses
 * `damage` HP) and the events with a page "Hit by a projectile"; it goes through the others.
 */
export const launch_projectile: BlockExecutor<'launch_projectile'> = async (context, params) => {
  const map = (context.player?.getCurrentMap?.() ?? context.map) as any;
  const record = map?.database?.()[params.projectile];
  if (!map?.projectiles?.emit || !isStudioProjectileRecord(record)) return;
  const source = (params.source === 'player' ? context.player : context.event) as VisualEffectAnchor | undefined;
  if (!source) return;

  const from = visualEffectPoint(source);
  const target = targetOf(context, params);
  const to = target ? visualEffectPoint(target) : undefined;
  const length = to ? Math.hypot(to.x - from.x, to.y - from.y) : 0;
  const direction = to && length > 0 ? { x: (to.x - from.x) / length, y: (to.y - from.y) / length } : visualEffectFacing(source);

  // At launch, what starts on the launcher; the rest of the effect is in the look of the projectile.
  const effect = resolveVisualEffect(map, record.visualEffect);
  const cast = effect ? visualEffectCastPart(effect) : undefined;
  if (cast) playStudioVisualEffect(map, cast, { from: source, to: target });

  const damage = Math.max(0, Number(params.damage ?? 0));
  const hurt = (hit: any) => {
    if (damage <= 0 || !hit || hit !== context.player || typeof hit.hp !== 'number') return;
    hit.hp = Math.max(0, hit.hp - damage);
  };
  const { projectile, area } = studioProjectileOptions(record, Number(map.tileWidth ?? 32));
  const lobbed = (projectile.trajectory as { type?: string } | undefined)?.type === 'arc';

  map.projectiles.emit(
    {
      ...projectile,
      type: params.projectile,
      origin: from,
      direction,
      // A bomb lands on its target instead of flying its whole range.
      ...(lobbed && to ? { target: to } : {}),
      payload: { projectileId: params.projectile },
      collision: { ignoreOwner: true },
      canHit: ({ target: hit, entity }: { target?: any; entity?: any }) => {
        // Walls stop it.
        if (!hit) return entity?.isStatic?.() === true;
        return hit !== source && (hit === context.player || typeof hit.onProjectileHit === 'function');
      },
      ...(area
        ? {
            onEnd: ({ x, y }: { x: number; y: number }) => {
              const player = context.player as any;
              if (!player) return;
              const center = visualEffectPoint(player);
              if (Math.hypot(center.x - x, center.y - y) <= area.radius) hurt(player);
            },
          }
        : {
            onHit: ({ target: hit }: { target?: any }) => hurt(hit),
          }),
    },
    source
  );
};
