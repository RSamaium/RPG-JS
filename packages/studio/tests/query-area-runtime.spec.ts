import { describe, expect, test, vi } from 'vitest';
import { defaultBlocks } from '../runtime/blocks/blocks';
import { defaultExecutors } from '../runtime/blocks/executors';
import { query_area, schemaQueryArea } from '../runtime/blocks/executors/query-area';

const createShapeApi = () => ({
  circle: vi.fn((options) => ({ type: 'circle', options })),
  rect: vi.fn((options) => ({ type: 'rect', options })),
  line: vi.fn((options) => ({ type: 'line', options })),
  cross: vi.fn((options) => ({ type: 'cross', options })),
});

const baseParams = {
  centerType: 'entity' as const,
  centerEventId: '$this',
  shape: 'circle' as const,
  targets: 'all' as const,
  includeOrigin: false,
  radius: 64,
};

describe('query_area runtime block', () => {
  test('registers a self-managed block with the native shape options', () => {
    expect(defaultBlocks.find((block) => block.type === 'query_area')).toBe(schemaQueryArea);
    expect(defaultExecutors.query_area).toBe(query_area);
    expect(schemaQueryArea.canHaveChildren).toBe(true);
    expect((schemaQueryArea.schema as any).properties.targets).toMatchObject({
      enum: ['players', 'events', 'all'],
      default: 'all',
    });

    const adapted = schemaQueryArea.schemaAdaptation?.({
      eventType: 'character',
      trigger: null,
      executionProfile: { source: 'map_load', capabilities: ['map', 'player'] },
    }, schemaQueryArea.schema) as any;
    expect(adapted.allOf[0].then.properties.centerEventId.default).toBe('$player');
  });

  test('builds a rotated rectangle and excludes its entity center', async () => {
    const areaShapeApi = createShapeApi();
    const center = { id: 'origin' };
    const queryArea = vi.fn(() => []);

    await query_area({
      event: center,
      player: {},
      map: { queryArea },
      areaShapeApi,
    } as any, {
      ...baseParams,
      shape: 'rect',
      width: 80,
      height: 40,
      angleDegrees: 90,
      offsetX: 4,
      offsetY: -2,
    });

    expect(areaShapeApi.rect).toHaveBeenCalledWith({
      width: 80,
      height: 40,
      angle: Math.PI / 2,
      offset: { x: 4, y: -2 },
    });
    expect(queryArea).toHaveBeenCalledWith(expect.objectContaining({
      center,
      targets: 'all',
      excludeIds: ['origin'],
    }));
  });

  test('builds line and cross shapes with native geometry options', async () => {
    const areaShapeApi = createShapeApi();
    const queryArea = vi.fn(() => []);
    const context = { event: { id: 'origin' }, player: {}, map: { queryArea }, areaShapeApi } as any;

    await query_area(context, {
      ...baseParams,
      centerType: 'position',
      centerPosition: { x: 10, y: 20 },
      shape: 'line',
      length: 96,
      thickness: 24,
      direction: 'left',
    });
    await query_area(context, {
      ...baseParams,
      shape: 'cross',
      armLength: 72,
      thickness: 16,
    });

    expect(areaShapeApi.line).toHaveBeenCalledWith(expect.objectContaining({
      length: 96,
      thickness: 24,
      direction: 'left',
    }));
    expect(areaShapeApi.cross).toHaveBeenCalledWith(expect.objectContaining({
      armLength: 72,
      thickness: 16,
    }));
    expect(queryArea).toHaveBeenNthCalledWith(1, expect.objectContaining({
      center: { x: 10, y: 20 },
      excludeIds: undefined,
    }));
  });

  test('executes children by distance and retargets each hit without mutating the original context', async () => {
    const areaShapeApi = createShapeApi();
    const originalPlayer = { id: 'original-player' };
    const originalEvent = { id: 'origin-event' };
    const foundPlayer = { id: 'player-b' };
    const foundEvent = { id: 'event-a' };
    const visited: Array<{ player: unknown; event: unknown; areaHit: unknown }> = [];
    const inspect = vi.fn((context) => visited.push({
      player: context.player,
      event: context.event,
      areaHit: context.areaHit,
    }));
    const hits = [
      { target: foundPlayer, id: 'player-b', kind: 'players', distance: 8, distanceRatio: 0.5, falloff: { linear: () => 0.5 } },
      { target: foundEvent, id: 'event-a', kind: 'events', distance: 4, distanceRatio: 0.25, falloff: { linear: () => 0.75 } },
    ];
    const context = {
      event: originalEvent,
      player: originalPlayer,
      map: { queryArea: vi.fn(() => hits) },
      areaShapeApi,
      executors: { inspect },
    } as any;

    await query_area(context, {
      ...baseParams,
      children: [{ id: 'child', type: 'inspect' as any, data: {} }],
    });

    expect(visited).toEqual([
      {
        player: originalPlayer,
        event: foundEvent,
        areaHit: { id: 'event-a', kind: 'events', distance: 4, distanceRatio: 0.25, falloffLinear: 0.75 },
      },
      {
        player: foundPlayer,
        event: originalEvent,
        areaHit: { id: 'player-b', kind: 'players', distance: 8, distanceRatio: 0.5, falloffLinear: 0.5 },
      },
    ]);
    expect(context.player).toBe(originalPlayer);
    expect(context.event).toBe(originalEvent);
  });

  test('uses a deterministic ID order when distances are equal', async () => {
    const order: string[] = [];
    const targetA = { id: 'a' };
    const targetB = { id: 'b' };
    await query_area({
      event: { id: 'origin' },
      player: {},
      map: {
        queryArea: () => [
          { target: targetB, id: 'b', kind: 'events', distance: 5, distanceRatio: 1, falloff: { linear: () => 0 } },
          { target: targetA, id: 'a', kind: 'events', distance: 5, distanceRatio: 1, falloff: { linear: () => 0 } },
        ],
      },
      areaShapeApi: createShapeApi(),
      executors: { inspect: (context) => order.push(context.areaHit.id) },
    } as any, {
      ...baseParams,
      includeOrigin: true,
      children: [{ id: 'child', type: 'inspect' as any, data: {} }],
    });

    expect(order).toEqual(['a', 'b']);
  });
});
