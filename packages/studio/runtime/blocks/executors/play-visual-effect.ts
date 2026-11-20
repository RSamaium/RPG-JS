import type { BlockDefinition, BlockExecutor, PlayVisualEffectAnchorType, PlayVisualEffectParams } from '../types';
import { getEvent } from './utils';
import { playStudioVisualEffect, type VisualEffectAnchor } from '../../visual-effects';

const mapPositionField = (title: string, description: string) => ({
  type: 'object',
  title,
  description,
  properties: {
    x: { type: 'number' },
    y: { type: 'number' }
  },
  format: {
    name: 'map-position',
    displayMode: 'single-map',
    selectionMode: 'position',
    returnType: 'position'
  }
}) as const;

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

export const schemaPlayVisualEffect: BlockDefinition<'play_visual_effect'> = {
  type: 'play_visual_effect',
  label: 'Play a visual effect',
  description: 'Play a visual effect of the database, with its sounds, from a character or a position, optionally toward a target',
  category: 'scene',
  icon: '🎆',
  requiredCapabilities: ['player', 'map'],
  schema: {
    type: 'object',
    properties: {
      effect: {
        type: 'string',
        title: 'Visual effect',
        description: 'Select a visual effect from the database',
        format: { name: 'visual-effect' } as any
      },
      source: {
        type: 'string',
        title: 'From',
        enum: ['player', 'event', 'position'],
        default: 'player',
        format: {
          radio: true,
          horizontal: true,
          labels: ['Player', 'Event', 'Map Position']
        }
      },
      sourceEventId: eventField('Source event', 'The event the effect starts from'),
      sourcePosition: mapPositionField('Source position', 'The position the effect starts from'),
      target: {
        type: 'string',
        title: 'Toward',
        description: 'Where the effect travels and its impact plays. Nothing: it travels the way the source faces, without its impact',
        enum: ['none', 'player', 'event', 'position'],
        default: 'none',
        format: {
          radio: true,
          horizontal: true,
          labels: ['Nothing', 'Player', 'Event', 'Map Position']
        }
      },
      targetEventId: eventField('Target event', 'The event the effect goes to'),
      targetPosition: mapPositionField('Target position', 'The position the effect goes to')
    },
    allOf: [
      { if: { properties: { source: { const: 'event' } } }, then: { required: ['sourceEventId'] } },
      { if: { properties: { source: { const: 'position' } } }, then: { required: ['sourcePosition'] } },
      { if: { properties: { target: { const: 'event' } } }, then: { required: ['targetEventId'] } },
      { if: { properties: { target: { const: 'position' } } }, then: { required: ['targetPosition'] } }
    ],
    required: ['effect', 'source']
  }
};

const resolveAnchor = (
  context: Parameters<BlockExecutor<'play_visual_effect'>>[0],
  type: PlayVisualEffectAnchorType | 'none' | undefined,
  eventId: string | undefined,
  position: { x: number; y: number } | undefined
): VisualEffectAnchor | undefined => {
  if (type === 'player') return context.player ?? undefined;
  if (type === 'event') return getEvent(context, { eventId }) as VisualEffectAnchor | undefined;
  if (type === 'position') return position;
  return undefined;
};

/**
 * Plays a Visual Effect of the database with `map.playVisualEffect`: from the player, an event or a position, toward
 * a target (its impact plays there) or the way the source faces. The block does not wait for the effect.
 */
export const play_visual_effect: BlockExecutor<'play_visual_effect'> = async (context, params) => {
  const map = context.player?.getCurrentMap?.() ?? context.map;
  if (!map) return;
  const from = resolveAnchor(context, params.source ?? 'player', params.sourceEventId, params.sourcePosition);
  if (!from) return;
  const to = resolveAnchor(context, params.target, params.targetEventId, params.targetPosition);
  playStudioVisualEffect(map, params.effect, { from, to });
};
