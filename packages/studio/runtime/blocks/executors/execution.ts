import type {
  BlockType,
  BlockParamsMap,
  BlockInstance,
  AnyBlockInstance,
  GameExecutionContext,
  RuntimeBlockExecutorRegistry
} from '../types';
import {
  isLocalhost,
  logBlockExecution,
  logBlockSequenceStart,
  logBlockSequenceEnd,
  formatBlockName
} from './utils';

/**
 * Block types that handle their own children execution
 * These blocks should not have their children executed automatically
 */
const BLOCKS_WITH_SELF_MANAGED_CHILDREN = new Set<BlockType>([
  'conditional_branch',
  'show_choices',
  'query_area'
]);

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
 * @param executors - Registry of block executors
 * @param block - Optional full block object (used for accessing children)
 * @param depth - Current nesting depth for logging
 * 
 * @example
 * ```typescript
 * // Execute a show_text block
 * await executeBlock('show_text', gameContext, {
 *   text: 'Hello!',
 *   position: 'bottom'
 * }, executors);
 * ```
 */
export async function executeBlock<T extends BlockType>(
  blockType: T,
  context: GameExecutionContext,
  params: BlockParamsMap[T],
  executors: RuntimeBlockExecutorRegistry,
  block?: BlockInstance<T>,
  depth: number = 0
): Promise<void> {
  const executor = executors[blockType];
  if (!executor) {
    console.warn(`No executor found for block type: ${blockType}`);
    return;
  }

  // Merge children from block into params if block is provided
  const finalParams = block?.children
    ? { ...params, children: block.children }
    : params;

  const startTime = isLocalhost() 
    ? (typeof performance !== 'undefined' ? performance.now() : Date.now()) 
    : undefined;

  try {
    await executor(context, finalParams as Record<string, unknown>);
    
    // Log execution after successful completion
    if (startTime !== undefined) {
      const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
      const duration = now - startTime;
      logBlockExecution(blockType, block?.id, finalParams as Record<string, unknown>, depth, duration);
    }
  } catch (error) {
    // Log error in development
    if (isLocalhost()) {
      console.error(
        `%c❌ Error executing block ${formatBlockName(blockType)} [${block?.id || 'unknown'}]`,
        'color: #F44336; font-weight: bold; font-size: 13px;',
        error
      );
    }
    throw error;
  }
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
 * @param executors - Registry of block executors
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
 * await executeBlocksRecursively(blocks, gameContext, executors);
 * ```
 */
/**
 * Gets executors from context with error handling
 * 
 * @param context - The execution context
 * @returns The executors registry
 * @throws Error if executors are not available in context
 */
export function getExecutorsFromContext(context: GameExecutionContext): RuntimeBlockExecutorRegistry {
  if (!context.executors) {
    throw new Error('Executors not available in execution context. Make sure to set context.executors when creating the context.');
  }
  return context.executors;
}

export async function executeBlocksRecursively(
  blocks: AnyBlockInstance[],
  context: GameExecutionContext,
  executors: RuntimeBlockExecutorRegistry,
  depth: number = 0
): Promise<void> {
  if (!Array.isArray(blocks) || blocks.length === 0) {
    return;
  }

  // Log sequence start (only at root level)
  const isRootLevel = depth === 0;
  const startTime = isRootLevel && isLocalhost() 
    ? (typeof performance !== 'undefined' ? performance.now() : Date.now())
    : undefined;
  
  if (isRootLevel) {
    logBlockSequenceStart(blocks.length);
  }

  for (const block of blocks) {
    if (!block || !block.type) {
      continue;
    }

    try {
      // Execute the block itself, passing the full block so children are available in params
      await executeBlock(
        block.type,
        context,
        block.data,
        executors,
        block,
        depth
      );

      // Execute children blocks recursively only if the block doesn't manage its own children
      // Blocks like conditional_branch and show_choices handle their children internally
      if (
        !BLOCKS_WITH_SELF_MANAGED_CHILDREN.has(block.type) &&
        Array.isArray(block.children) &&
        block.children.length > 0
      ) {
        await executeBlocksRecursively(block.children, context, executors, depth + 1);
      }
    } catch (error) {
      if (isLocalhost()) {
        console.error(
          `%c❌ Error executing block ${formatBlockName(block.type)} [${block.id || 'unknown'}]`,
          'color: #F44336; font-weight: bold; font-size: 13px;',
          error
        );
      }
      throw error;
    }
  }

  // Log sequence end (only at root level)
  if (isRootLevel && startTime !== undefined) {
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const totalDuration = now - startTime;
    logBlockSequenceEnd(blocks.length, totalDuration);
  }
}
