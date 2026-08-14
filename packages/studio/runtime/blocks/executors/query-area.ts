import type {
  AreaHitContext,
  BlockDefinition,
  BlockExecutor,
  QueryAreaParams,
} from '../types';
import { executeBlocksRecursively, getExecutorsFromContext } from './execution';
import { getEvent } from './utils';

export const schemaQueryArea: BlockDefinition<'query_area'> = {
  type: 'query_area',
  label: 'block.query area.label',
  description: 'block.query area.description',
  category: 'control',
  icon: '🎯',
  requiredCapabilities: ['map'],
  canHaveChildren: true,
  schema: {
    type: 'object',
    properties: {
      centerType: {
        type: 'string',
        title: 'block.query area.center type',
        enum: ['entity', 'position'],
        default: 'entity',
        format: { labels: ['block.query area.center entity', 'block.query area.center position'] },
      },
      shape: {
        type: 'string',
        title: 'block.query area.shape',
        enum: ['circle', 'rect', 'line', 'cross'],
        default: 'circle',
        format: {
          labels: [
            'block.query area.circle',
            'block.query area.rectangle',
            'block.query area.line',
            'block.query area.cross',
          ],
        },
      },
      targets: {
        type: 'string',
        title: 'block.query area.targets',
        enum: ['players', 'events', 'all'],
        default: 'all',
        format: {
          labels: [
            'block.query area.players',
            'block.query area.events',
            'block.query area.all targets',
          ],
        },
      },
      includeOrigin: {
        type: 'boolean',
        title: 'block.query area.include origin',
        default: false,
      },
      offsetX: { type: 'number', title: 'block.query area.offset x', default: 0 },
      offsetY: { type: 'number', title: 'block.query area.offset y', default: 0 },
    },
    allOf: [
      {
        if: { properties: { centerType: { const: 'entity' } } },
        then: {
          properties: {
            centerEventId: {
              type: 'string',
              title: 'block.query area.center entity',
              description: 'block.query area.center entity description',
              default: '$this',
              format: {
                name: 'map-position',
                displayMode: 'single-map',
                selectionMode: 'event',
                returnType: 'eventId',
                player: true,
              },
            },
          },
          required: ['centerEventId'],
        },
        else: {
          properties: {
            centerPosition: {
              type: 'object',
              title: 'block.query area.center position',
              properties: { x: { type: 'number' }, y: { type: 'number' } },
              format: {
                name: 'map-position',
                displayMode: 'single-map',
                selectionMode: 'position',
                returnType: 'position',
              },
            },
          },
          required: ['centerPosition'],
        },
      },
      shapeFields('circle', {
        radius: { type: 'number', title: 'block.query area.radius', minimum: 1, default: 64 },
      }, ['radius']),
      shapeFields('rect', {
        width: { type: 'number', title: 'block.query area.width', minimum: 1, default: 64 },
        height: { type: 'number', title: 'block.query area.height', minimum: 1, default: 64 },
        angleDegrees: { type: 'number', title: 'block.query area.angle', default: 0 },
      }, ['width', 'height']),
      shapeFields('line', {
        length: { type: 'number', title: 'block.query area.length', minimum: 1, default: 96 },
        thickness: { type: 'number', title: 'block.query area.thickness', minimum: 1, default: 32 },
        direction: {
          type: 'string',
          title: 'block.query area.direction',
          enum: ['up', 'down', 'left', 'right'],
          default: 'down',
          format: {
            labels: [
              'block.query area.up',
              'block.query area.down',
              'block.query area.left',
              'block.query area.right',
            ],
          },
        },
      }, ['length', 'thickness', 'direction']),
      shapeFields('cross', {
        armLength: { type: 'number', title: 'block.query area.arm length', minimum: 1, default: 64 },
        thickness: { type: 'number', title: 'block.query area.thickness', minimum: 1, default: 32 },
      }, ['armLength', 'thickness']),
    ],
    required: ['centerType', 'shape', 'targets', 'includeOrigin'],
  },
  schemaAdaptation: (context, schema) => {
    if (context.executionProfile.source !== 'map_load' || !Array.isArray(schema.allOf)) return schema;
    const [centerCondition, ...shapeConditions] = schema.allOf;
    return {
      ...schema,
      allOf: [{
        ...centerCondition,
        then: {
          ...centerCondition.then,
          properties: {
            ...centerCondition.then.properties,
            centerEventId: {
              ...centerCondition.then.properties.centerEventId,
              default: '$player',
            },
          },
        },
      }, ...shapeConditions],
    };
  },
};

function shapeFields(shape: QueryAreaParams['shape'], properties: Record<string, unknown>, required: string[]) {
  return {
    if: { properties: { shape: { const: shape } } },
    then: { properties, required },
  };
}

type QueryAreaHit = {
  target: unknown;
  id: string;
  kind: 'players' | 'events' | 'custom';
  distance: number;
  distanceRatio: number;
  falloff: { linear(): number };
};

const finitePositive = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null;

const finite = (value: unknown, fallback = 0): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;

const buildShape = (context: Parameters<BlockExecutor<'query_area'>>[0], params: QueryAreaParams): unknown => {
  const api = context.areaShapeApi;
  if (!api) return null;
  const offset = { x: finite(params.offsetX), y: finite(params.offsetY) };
  if (params.shape === 'circle') {
    const radius = finitePositive(params.radius);
    return radius ? api.circle({ radius, offset }) : null;
  }
  if (params.shape === 'rect') {
    const width = finitePositive(params.width);
    const height = finitePositive(params.height);
    return width && height
      ? api.rect({ width, height, offset, angle: finite(params.angleDegrees) * Math.PI / 180 })
      : null;
  }
  if (params.shape === 'line') {
    const length = finitePositive(params.length);
    const thickness = finitePositive(params.thickness);
    return length && thickness
      ? api.line({ length, thickness, direction: params.direction ?? 'down', offset })
      : null;
  }
  const armLength = finitePositive(params.armLength);
  const thickness = finitePositive(params.thickness);
  return armLength && thickness ? api.cross({ armLength, thickness, offset }) : null;
};

const toAreaHitContext = (hit: QueryAreaHit): AreaHitContext => ({
  id: hit.id,
  kind: hit.kind as AreaHitContext['kind'],
  distance: hit.distance,
  distanceRatio: hit.distanceRatio,
  falloffLinear: hit.falloff.linear(),
});

export const query_area: BlockExecutor<'query_area'> = async (context, params) => {
  const map = context.map ?? context.event?.getCurrentMap?.() ?? context.player?.getCurrentMap?.();
  if (!map || typeof map.queryArea !== 'function') {
    console.warn('[StudioBlocks] query_area requires a map exposing queryArea()');
    return;
  }

  let entityCenter: ReturnType<typeof getEvent>;
  if (params.centerType === 'entity') {
    try {
      entityCenter = getEvent(context, { eventId: params.centerEventId ?? '$this' });
    } catch {
      entityCenter = undefined;
    }
  }
  const center = params.centerType === 'position' ? params.centerPosition : entityCenter;
  const shape = buildShape(context, params);
  if (!center || !shape) {
    console.warn('[StudioBlocks] query_area requires a valid center, shape and AreaShape API');
    return;
  }

  const centerId = typeof entityCenter?.id === 'string' ? entityCenter.id : undefined;
  const hits = (map.queryArea({
    center,
    shape,
    targets: params.targets,
    excludeIds: !params.includeOrigin && centerId ? [centerId] : undefined,
  }) as QueryAreaHit[])
    .filter((hit) => hit.kind === 'players' || hit.kind === 'events')
    .sort((a, b) => a.distance - b.distance || a.id.localeCompare(b.id));

  if (!params.children?.length) return;
  const executors = getExecutorsFromContext(context);
  for (const hit of hits) {
    const nextContext = {
      ...context,
      areaHit: toAreaHitContext(hit),
      ...(hit.kind === 'players' ? { player: hit.target } : { event: hit.target }),
    };
    await executeBlocksRecursively(params.children, nextContext, executors);
  }
};
