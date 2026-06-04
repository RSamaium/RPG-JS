import type {
  BlockType,
  BlockParamsMap,
  BlockInstance,
  AnyBlockInstance,
  BlockExecutorRegistry,
  PartialBlockExecutorRegistry,
  RuntimeBlockExecutorRegistry,
  GameExecutionContext
} from './types';

// Import all block executors from individual files
import {
  show_text,
  show_choices,
  show_notification,
  conditional_branch,
  wait,
  set_variable,
  set_switch,
  self_switch,
  change_gold,
  change_hp,
  change_sp,
  change_exp,
  change_level,
  change_parameter,
  recover_all,
  change_variable,
  change_item,
  change_equipment,
  change_skill,
  use_skill,
  move_route,
  change_character_graphic,
  apply_graphic_animation,
  show_up_animation,
  transfer_player,
  show_animation,
  set_weather,
  call_main_menu,
  call_gameover,
  show_save,
  call_shop,
  erase_event,
  play_bgm,
  play_se,
  call_common_event,
  spawn_common_event
} from './executors/index';

// Import execution functions
import {
  executeBlock as executeBlockCore,
  executeBlocksRecursively as executeBlocksRecursivelyCore
} from './executors/execution';

// ============================================================================
// Default Block Executors Registry
// ============================================================================

/**
 * Default block executors for the game engine
 * 
 * These functions define how each block type is executed within the game engine.
 * Each executor receives a strongly-typed context object and parameters specific
 * to the block type.
 * 
 * The registry is fully typed: each key maps to an executor that receives
 * the correct params type from BlockParamsMap.
 * 
 * @example
 * ```typescript
 * import { defaultExecutors } from '@common/blocks/executors';
 * 
 * // In the game engine - params is typed as ShowTextParams
 * const executor = defaultExecutors['show_text'];
 * await executor(gameContext, { text: 'Hello World!', position: 'bottom' });
 * ```
 */
export const defaultExecutors: BlockExecutorRegistry<BlockType> = {
  show_text,
  show_choices,
  show_notification,
  conditional_branch,
  wait,
  set_variable,
  set_switch,
  self_switch,
  change_gold,
  change_hp,
  change_sp,
  change_exp,
  change_level,
  change_parameter,
  recover_all,
  change_variable,
  change_item,
  change_equipment,
  change_skill,
  use_skill,
  move_route,
  change_character_graphic,
  apply_graphic_animation,
  show_up_animation,
  transfer_player,
  show_animation,
  set_weather,
  call_main_menu,
  call_gameover,
  show_save,
  call_shop,
  erase_event,
  play_bgm,
  play_se,
  call_common_event,
  spawn_common_event,
};

// ============================================================================
// Executor Registry Factory
// ============================================================================

/**
 * Creates a custom block executor registry by merging default executors with custom ones
 * 
 * This function allows you to extend or override the default executors with custom
 * implementations. The resulting registry maintains full type safety.
 * 
 * @param customExecutors - Custom block executors to add or override
 * @returns Combined executor registry with all default and custom executors
 * 
 * @example
 * ```typescript
 * // Add a custom block executor
 * const customExecutors = {
 *   show_text: async (context, params) => {
 *     // Custom implementation
 *     console.log('Custom show_text:', params.text);
 *     await context.player.showText(params.text);
 *   }
 * };
 * 
 * const executors = createExecutorRegistry(customExecutors);
 * ```
 */
export function createExecutorRegistry(
  customExecutors: PartialBlockExecutorRegistry = {}
): RuntimeBlockExecutorRegistry {
  return {
    ...defaultExecutors,
    ...customExecutors
  } as unknown as RuntimeBlockExecutorRegistry;
}

// ============================================================================
// Block Execution Functions
// ============================================================================

/**
 * Executes a single block with the given context and parameters
 * 
 * This function looks up the executor for the given block type and executes it
 * with the provided context and parameters. If no executor is found, a warning
 * is logged and execution continues.
 * 
 * @typeParam T - The block type
 * @param blockType - The type of block to execute
 * @param context - The execution context
 * @param params - Block parameters
 * @param executors - Registry of block executors (defaults to defaultExecutors)
 * @param block - Optional full block object (used for accessing children)
 * @param depth - Current nesting depth for logging
 * 
 * @example
 * ```typescript
 * // Execute a show_text block
 * await executeBlock('show_text', gameContext, {
 *   text: 'Hello!',
 *   position: 'bottom'
 * });
 * 
 * // Execute with custom executors
 * await executeBlock('show_text', gameContext, params, customExecutors);
 * ```
 */
export async function executeBlock<T extends BlockType>(
  blockType: T,
  context: GameExecutionContext,
  params: BlockParamsMap[T],
  executors: RuntimeBlockExecutorRegistry = defaultExecutors as unknown as RuntimeBlockExecutorRegistry,
  block?: BlockInstance<T>,
  depth: number = 0
): Promise<void> {
  return executeBlockCore(blockType, context, params, executors, block, depth);
}

/**
 * Executes a sequence of blocks recursively, including their children
 * 
 * This function executes blocks in sequence and recursively processes any child blocks
 * that may be attached to them. It handles nested block structures including blocks
 * with children arrays and choice-specific children for show_choices blocks.
 * 
 * @param blocks - Array of blocks to execute
 * @param context - The execution context
 * @param executors - Registry of block executors (defaults to defaultExecutors)
 * @param depth - Current nesting depth for logging
 * 
 * @example
 * ```typescript
 * const blocks: AnyBlockInstance[] = [
 *   {
 *     id: '1',
 *     type: 'show_text',
 *     data: { text: 'Hello!' }
 *   },
 *   {
 *     id: '2',
 *     type: 'wait',
 *     data: { duration: 2 }
 *   }
 * ];
 * await executeBlocksRecursively(blocks, gameContext);
 * ```
 */
export async function executeBlocksRecursively(
  blocks: AnyBlockInstance[],
  context: GameExecutionContext,
  executors: RuntimeBlockExecutorRegistry = defaultExecutors as unknown as RuntimeBlockExecutorRegistry,
  depth: number = 0
): Promise<void> {
  return executeBlocksRecursivelyCore(blocks, context, executors, depth);
}

// Re-export types for convenience
export type {
  BlockExecutorRegistry,
  PartialBlockExecutorRegistry,
  RuntimeBlockExecutorRegistry
} from './types';
