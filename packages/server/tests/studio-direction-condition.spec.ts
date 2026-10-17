import { afterEach, beforeEach, expect, it } from 'vitest';
import { testing, TestingFixture } from '@rpgjs/testing';
import { createModule, defineModule } from '@rpgjs/common';
import { Direction } from '@rpgjs/common';
import { evaluateConditionalBranch } from '../../studio/runtime/blocks/condition-evaluator';

let fixture: TestingFixture;
let client: any;

beforeEach(async () => {
  const server = defineModule({
    maps: [{ id: 'direction-map' }],
    player: { async onConnected(player: any) { await player.changeMap('direction-map', { x: 100, y: 100 }); } },
  });
  fixture = await testing(createModule('DirectionCondition', [{ server, client: defineModule({}) }]));
  client = await fixture.createClient();
});

afterEach(() => fixture.clear());

it('matches the direction a real RpgPlayer faces', async () => {
  const player: any = await client.waitForMapChange('direction-map');
  const check = (expected: string) =>
    evaluateConditionalBranch(
      { conditionType: 'player', playerProperty: 'direction', playerDirection: expected } as any,
      { player, event: null }
    );

  expect(typeof player.direction).toBe('function');

  player.changeDirection(Direction.Left);
  expect(check('left')).toBe(true);
  expect(check('up')).toBe(false);

  player.changeDirection(Direction.Up);
  expect(check('up')).toBe(true);
  expect(check('left')).toBe(false);
});
