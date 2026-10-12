import type {
  GameExecutionContext,
  BlockExecutor,
  WaitParams
} from '../types';

export const schemaWait = {
  type: 'wait',
  label: 'Wait',
  description: 'Pause execution for a specified duration',
  category: 'control',
  icon: '⏸️',
  schema: {
    type: 'object',
    properties: {
      duration: {
        type: 'number',
        title: 'Wait Duration (seconds)',
        minimum: 0.1,
        default: 1
      }
    },
    required: ['duration']
  }
} as const;

/**
 * Pauses execution for a specified duration
 * 
 * This executor stops block execution for a given number of seconds,
 * allowing for timing control in game events such as delays between
 * actions or creating dramatic pauses.
 * 
 * @param context - The execution context
 * @param params - Parameters containing the duration in seconds
 * 
 * @example
 * ```typescript
 * // Wait for 2 seconds
 * await waitExecutor(context, { duration: 2 });
 * 
 * // Wait for half a second
 * await waitExecutor(context, { duration: 0.5 });
 * ```
 */
export const wait: BlockExecutor<'wait'> = async (context, params) => {
  await new Promise(resolve => setTimeout(resolve, (params.duration ?? 1) * 1000));
};

