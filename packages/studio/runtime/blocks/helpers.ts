import {
  BlockType,
  BlockParamsMap,
  BlockDefinition,
  BlockExecutor,
  BlockCategory,
  AnyBlockDefinition,
  AnyBlockInstance
} from './types';

// ============================================================================
// Block Creation Helpers
// ============================================================================

/**
 * Creates a strongly-typed block definition
 * 
 * This helper function ensures that when you create a block definition,
 * the type field is constrained to valid BlockType values and the schema
 * is properly structured.
 * 
 * @typeParam T - The block type (must be a valid BlockType)
 * @param definition - The block definition object
 * @returns A typed BlockDefinition
 * 
 * @example
 * ```typescript
 * // Create a typed block definition
 * const myBlock = createBlockDefinition({
 *   type: 'show_text',
 *   label: 'Show Text',
 *   description: 'Display a message dialog',
 *   category: 'message',
 *   icon: '💬',
 *   schema: {
 *     type: 'object',
 *     properties: {
 *       text: { type: 'string', title: 'Message' }
 *     }
 *   }
 * });
 * ```
 */
export function createBlockDefinition<T extends BlockType>(
  definition: BlockDefinition<T>
): BlockDefinition<T> {
  return definition;
}

/**
 * Creates a strongly-typed block executor
 * 
 * This helper function ensures that when you create an executor,
 * the params parameter is correctly typed based on the block type.
 * 
 * @typeParam T - The block type (must be a valid BlockType)
 * @param type - The block type this executor handles
 * @param executor - The executor function
 * @returns A typed BlockExecutor
 * 
 * @example
 * ```typescript
 * // Create a typed executor for show_text
 * const showTextExecutor = createBlockExecutor('show_text', async (context, params) => {
 *   // params is typed as ShowTextParams
 *   await context.player.showText(params.text, {
 *     position: params.position
 *   });
 * });
 * ```
 */
export function createBlockExecutor<T extends BlockType>(
  _type: T,
  executor: BlockExecutor<T>
): BlockExecutor<T> {
  return executor;
}

/**
 * Creates a block instance with proper typing
 * 
 * This helper ensures that block instances are created with the correct
 * data type based on the block type.
 * 
 * @typeParam T - The block type
 * @param type - The block type
 * @param id - Unique identifier for this instance
 * @param data - Block parameters (typed based on block type)
 * @param children - Optional child blocks
 * @returns A typed BlockInstance
 * 
 * @example
 * ```typescript
 * // Create a typed block instance
 * const textBlock = createBlockInstance('show_text', 'block-1', {
 *   text: 'Hello World!',
 *   position: 'bottom'
 * });
 * 
 * // Create a conditional block with children
 * const conditionalBlock = createBlockInstance('conditional_branch', 'block-2', {
 *   conditionType: 'variable',
 *   variableId: 'score',
 *   comparison: 'greater',
 *   valueType: 'constant',
 *   constantValue: 100
 * }, [textBlock]);
 * ```
 */
export function createBlockInstance<T extends BlockType>(
  type: T,
  id: string,
  data: BlockParamsMap[T],
  children?: AnyBlockInstance[]
): { id: string; type: T; data: BlockParamsMap[T]; children?: AnyBlockInstance[] } {
  return {
    id,
    type,
    data,
    ...(children && { children })
  };
}

// ============================================================================
// Block Validation Helpers
// ============================================================================

/**
 * Validates that a block type is a valid BlockType
 * 
 * This is a type guard that can be used to narrow unknown strings
 * to BlockType at runtime.
 * 
 * @param type - The type string to validate
 * @returns True if the type is a valid BlockType
 * 
 * @example
 * ```typescript
 * const userInput = 'show_text';
 * if (isValidBlockType(userInput)) {
 *   // userInput is now typed as BlockType
 *   const executor = executors[userInput];
 * }
 * ```
 */
export function isValidBlockType(type: string): type is BlockType {
  const validTypes: BlockType[] = [
    'show_text', 'show_input', 'show_choices',
    'conditional_branch', 'wait',
    'set_variable', 'set_switch', 'self_switch', 'change_gold', 'change_item', 'change_equipment', 'change_variable',
    'change_character_graphic',
    'play_bgm', 'play_se',
  ];
  return validTypes.includes(type as BlockType);
}

/**
 * Validates a block instance structure
 * 
 * Checks that a block instance has all required fields and valid types.
 * 
 * @param block - The block to validate
 * @returns True if the block is valid
 * 
 * @example
 * ```typescript
 * const block = JSON.parse(blockJson);
 * if (isValidBlockInstance(block)) {
 *   await executor.executeSingleBlock(block);
 * } else {
 *   console.error('Invalid block structure');
 * }
 * ```
 */
export function isValidBlockInstance(block: unknown): block is AnyBlockInstance {
  if (typeof block !== 'object' || block === null) {
    return false;
  }
  
  const b = block as Record<string, unknown>;
  
  if (typeof b['id'] !== 'string' || (b['id'] as string).length === 0) {
    return false;
  }
  
  if (typeof b['type'] !== 'string' || !isValidBlockType(b['type'] as string)) {
    return false;
  }
  
  if (typeof b['data'] !== 'object' || b['data'] === null) {
    return false;
  }
  
  if (b['children'] !== undefined && !Array.isArray(b['children'])) {
    return false;
  }
  
  return true;
}

// ============================================================================
// Block Category Helpers
// ============================================================================

/**
 * Category metadata for UI display
 */
export interface CategoryMetadata {
  /** Category identifier */
  id: BlockCategory;
  /** Display label */
  label: string;
  /** Category description */
  description: string;
  /** Icon or emoji */
  icon: string;
  /** Sort order (lower = first) */
  order: number;
}

/**
 * Default category metadata
 */
export const categoryMetadata: Record<BlockCategory, CategoryMetadata> = {
  message: {
    id: 'message',
    label: 'Message',
    description: 'Dialog and text display blocks',
    icon: '💬',
    order: 1
  },
  control: {
    id: 'control',
    label: 'Control Flow',
    description: 'Conditional and loop blocks',
    icon: '🔀',
    order: 2
  },
  variable: {
    id: 'variable',
    label: 'Variables',
    description: 'Variable and data manipulation blocks',
    icon: '📊',
    order: 3
  },
  character: {
    id: 'character',
    label: 'Character',
    description: 'Character movement and appearance blocks',
    icon: '🚶',
    order: 4
  },
  scene: {
    id: 'scene',
    label: 'Scene',
    description: 'Map and screen effect blocks',
    icon: '🗺️',
    order: 5
  },
  audio: {
    id: 'audio',
    label: 'Audio',
    description: 'Music and sound effect blocks',
    icon: '🎵',
    order: 6
  },
  system: {
    id: 'system',
    label: 'System',
    description: 'System and utility blocks',
    icon: '⚙️',
    order: 7
  },
  custom: {
    id: 'custom',
    label: 'Custom',
    description: 'Custom and plugin blocks',
    icon: '🔧',
    order: 8
  }
};

/**
 * Gets sorted categories for UI display
 * 
 * @returns Array of categories sorted by order
 * 
 * @example
 * ```typescript
 * const categories = getSortedCategories();
 * categories.forEach(cat => {
 *   console.log(`${cat.icon} ${cat.label}`);
 * });
 * ```
 */
export function getSortedCategories(): CategoryMetadata[] {
  return Object.values(categoryMetadata).sort((a, b) => a.order - b.order);
}

// ============================================================================
// Block Registration Helper
// ============================================================================

/**
 * Configuration for registering a new block
 * 
 * This interface combines all the pieces needed to add a new block
 * to the system: definition, executor, and optional metadata.
 */
export interface BlockRegistration<T extends BlockType> {
  /** Block definition for the UI */
  definition: BlockDefinition<T>;
  /** Executor function for runtime */
  executor: BlockExecutor<T>;
}

/**
 * Creates a complete block registration
 * 
 * This helper combines a block definition and executor into a single
 * registration object, ensuring type consistency between them.
 * 
 * @typeParam T - The block type
 * @param config - Block definition and executor
 * @returns A BlockRegistration object
 * 
 * @example
 * ```typescript
 * // Register a complete block (definition + executor)
 * const showTextRegistration = registerBlock<'show_text'>({
 *   definition: {
 *     type: 'show_text',
 *     label: 'Show Text',
 *     description: 'Display a message dialog',
 *     category: 'message',
 *     icon: '💬',
 *     schema: { ... }
 *   },
 *   executor: async (context, params) => {
 *     await context.player.showText(params.text);
 *   }
 * });
 * ```
 */
export function registerBlock<T extends BlockType>(
  config: BlockRegistration<T>
): BlockRegistration<T> {
  return config;
}

// ============================================================================
// Documentation: How to Add a New Block
// ============================================================================

/**
 * # How to Add a New Block to the System
 * 
 * Adding a new block requires changes in multiple files to ensure type safety
 * throughout the system. Follow these steps:
 * 
 * ## Step 1: Add the Block Type
 * 
 * In `common/blocks/types.ts`, add your new block type to the `BlockType` union:
 * 
 * ```typescript
 * export type BlockType =
 *   | 'show_text'
 *   | 'my_new_block'  // <-- Add your new type here
 *   | ...;
 * ```
 * 
 * ## Step 2: Define the Parameters Interface
 * 
 * In `common/blocks/types.ts`, create an interface for your block's parameters:
 * 
 * ```typescript
 * export interface MyNewBlockParams {
 *   // Define all parameters your block needs
 *   someValue: string;
 *   optionalValue?: number;
 * }
 * ```
 * 
 * ## Step 3: Add to BlockParamsMap
 * 
 * In `common/blocks/types.ts`, add your block to the `BlockParamsMap`:
 * 
 * ```typescript
 * export interface BlockParamsMap {
 *   // ... existing blocks
 *   my_new_block: MyNewBlockParams;
 * }
 * ```
 * 
 * ## Step 4: Create the Block Definition
 * 
 * In `common/blocks/definitions.ts`, add your block to `defaultBlocks`:
 * 
 * ```typescript
 * {
 *   type: 'my_new_block',
 *   label: 'My New Block',
 *   description: 'Description of what this block does',
 *   category: 'message', // or appropriate category
 *   icon: '🆕',
 *   schema: {
 *     type: 'object',
 *     properties: {
 *       someValue: {
 *         type: 'string',
 *         title: 'Some Value',
 *         description: 'Description of this field'
 *       },
 *       optionalValue: {
 *         type: 'number',
 *         title: 'Optional Value',
 *         default: 0
 *       }
 *     },
 *     required: ['someValue']
 *   }
 * }
 * ```
 * 
 * ## Step 5: Implement the Executor
 * 
 * In `common/blocks/executors.ts`, add your executor to `defaultExecutors`:
 * 
 * ```typescript
 * my_new_block: async (context, params) => {
 *   // params is typed as MyNewBlockParams
 *   console.log('Executing my_new_block with:', params.someValue);
 *   
 *   // Use context to interact with the game
 *   await context.player.showText(params.someValue);
 * },
 * ```
 * 
 * ## Step 6: Verify Type Safety
 * 
 * After adding your block, TypeScript will verify:
 * - The block type is valid in all usages
 * - The executor receives correctly typed params
 * - Block instances have the correct data structure
 * 
 * If you forget any step, TypeScript will show an error.
 * 
 * ## Using Helpers
 * 
 * You can use the helper functions in this file to create blocks:
 * 
 * ```typescript
 * import { createBlockDefinition, createBlockExecutor } from '@common/blocks/helpers';
 * 
 * const definition = createBlockDefinition({
 *   type: 'my_new_block',
 *   // ... TypeScript will enforce correct structure
 * });
 * 
 * const executor = createBlockExecutor('my_new_block', async (context, params) => {
 *   // params is automatically typed as MyNewBlockParams
 * });
 * ```
 */
export const BLOCK_CREATION_GUIDE = 'See JSDoc above for documentation';
