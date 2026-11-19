import { excludeTriggers } from '../context-helpers';
import type { BattleOutcome, BlockExecutor, GameExecutionContext, StartBattleParams } from '../types';
import { variableSchema } from '@common/schemas/database';

/** The hooks a battle system of the game implements (`studioBattle: { start, startTurnBased, startTactical }`). */
export type StudioBattleHook = 'start' | 'startTurnBased' | 'startTactical';

/**
 * The value `outcomeVariableId` receives for each outcome. `abandon` (the player left a tactical battle before its end)
 * counts as an escape: the player neither won nor lost.
 */
export const BATTLE_OUTCOME_VALUES: Readonly<Record<BattleOutcome | 'abandon', number>> = {
  victory: 1,
  defeat: 2,
  escape: 3,
  abandon: 3,
};

const OUTCOMES = new Set(Object.keys(BATTLE_OUTCOME_VALUES));

/** The outcome a battle system answered, from what its hook returned: `{ outcome }` (a battle result) or the outcome itself. */
const outcomeOf = (value: unknown): keyof typeof BATTLE_OUTCOME_VALUES | undefined => {
  const outcome = value && typeof value === 'object' ? (value as { outcome?: unknown }).outcome : value;
  return typeof outcome === 'string' && OUTCOMES.has(outcome) ? (outcome as keyof typeof BATTLE_OUTCOME_VALUES) : undefined;
};

/**
 * Asks the battle systems of the game to play a troop through one of their hooks (`studioBattle: { <name> }` of a game
 * module). The call ends with the battle, so the blocks after it run once it is over.
 *
 * Every module that implements the hook is called; the one that plays the troop returns its result (`{ outcome }`),
 * the others return nothing. A system that returns no outcome leaves it unknown.
 *
 * @returns The outcome of the battle, or `undefined` when no system played it or none told how it ended.
 */
export async function runBattleHook(
  context: { player: unknown },
  name: StudioBattleHook,
  troopId: string | undefined
): Promise<keyof typeof BATTLE_OUTCOME_VALUES | undefined> {
  const player = context.player as any;
  if (!troopId || !player?.hooks?.callHooks) return undefined;
  return new Promise((resolve, reject) => {
    let outcome: keyof typeof BATTLE_OUTCOME_VALUES | undefined;
    player.hooks.callHooks(`server-studioBattle-${name}`, player, troopId).subscribe({
      next: (results: unknown) => {
        for (const result of Array.isArray(results) ? results : [results]) {
          outcome ??= outcomeOf(result);
        }
      },
      error: reject,
      complete: () => resolve(outcome),
    });
  });
}

/** Plays the battle of a block, then writes its outcome to `outcomeVariableId` when the block names one. */
export async function playBattleBlock(context: GameExecutionContext, name: StudioBattleHook, params: StartBattleParams): Promise<void> {
  const outcome = await runBattleHook(context, name, params.troopId);
  if (!params.outcomeVariableId || !outcome) return;
  const value = BATTLE_OUTCOME_VALUES[outcome];
  // Written as the Set Variable block does: through the context, else on the player
  if (typeof context.setVariable === 'function') context.setVariable(params.outcomeVariableId, value);
  else (context.player as any)?.setVariable?.(params.outcomeVariableId, value);
}

/** Schema of a battle block: the troop to fight, and the variable that receives how the battle ended. */
export const battleBlockSchema = {
  type: 'object',
  properties: {
    troopId: {
      type: 'string',
      title: 'Troop',
      description: 'Select a troop from the database',
      $ref: '#/functions/troop'
    },
    outcomeVariableId: {
      type: 'string',
      title: 'Outcome Variable',
      description: 'Optional. Receives how the battle ended: 1 victory, 2 defeat, 3 escape. A conditional branch on it chooses what follows',
      $ref: '#/functions/variable',
      format: {
        add: {
          schema: variableSchema
        }
      }
    }
  },
  required: ['troopId']
} as const;

export const schemaStartBattle = {
  type: 'start_battle',
  label: 'Start Battle',
  description: 'Fight a troop of the database. The battle system the project uses plays it (turn-based, or tactical when the troop has an arena); the event goes on when the battle is over',
  category: 'scene',
  icon: '⚔️',
  requiredCapabilities: ['player'],
  contextCondition: excludeTriggers('onInit'),
  schema: battleBlockSchema
} as const;

// The system that plays the troop answers: the hook is called once, and ends when the battle does
export const start_battle: BlockExecutor<'start_battle'> = (context, params) => playBattleBlock(context, 'start', params);
