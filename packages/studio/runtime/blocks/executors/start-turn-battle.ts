import { excludeTriggers } from '../context-helpers';
import type { BlockExecutor } from '../types';
import { battleBlockSchema, playBattleBlock } from './start-battle';

export const schemaStartTurnBattle = {
  type: 'start_turn_battle',
  label: 'Start Turn-Based Battle',
  description: 'Fight a troop of the database in a turn-based battle, whatever else the troop is set up for. The event goes on when the battle is over',
  category: 'scene',
  icon: '🎲',
  requiredCapabilities: ['player'],
  contextCondition: excludeTriggers('onInit'),
  schema: battleBlockSchema
} as const;

export const start_turn_battle: BlockExecutor<'start_turn_battle'> = (context, params) => playBattleBlock(context, 'startTurnBased', params);
