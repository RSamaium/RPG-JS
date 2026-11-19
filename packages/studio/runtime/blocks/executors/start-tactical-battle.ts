import { excludeTriggers } from '../context-helpers';
import type { BlockExecutor } from '../types';
import { battleBlockSchema, playBattleBlock } from './start-battle';

export const schemaStartTacticalBattle = {
  type: 'start_tactical_battle',
  label: 'Start Tactical Battle',
  description: 'Fight a troop of the database in a tactical battle on a grid, on the arena its Tactical tab names (it has to be on the map of the player). The event goes on when the battle is over',
  category: 'scene',
  icon: '♟️',
  requiredCapabilities: ['player'],
  contextCondition: excludeTriggers('onInit'),
  schema: battleBlockSchema
} as const;

export const start_tactical_battle: BlockExecutor<'start_tactical_battle'> = (context, params) => playBattleBlock(context, 'startTactical', params);
