import { BlockDefinition } from './types';
import { EventType } from '../event-types';
import { 
  mergeJsonSchemas, 
  removeFromJsonSchema, 
  overrideJsonSchema 
} from '../utils';

/**
 * Function reference schemas for block properties
 * 
 * These schemas define the structure for dynamic property references
 * that can be resolved at runtime (e.g., selecting from database entities).
 */
export const functionSchemas = {
  /**
   * Event selection schema
   * Allows selecting an event from the database
   */
  event: {
    type: 'string',
    title: 'Event',
    description: 'Select an event from the database',
    format: 'select',
    options: {
      source: 'database',
      type: 'event',
      displayField: 'name',
      valueField: '_id'
    }
  },

  /**
   * Variable selection schema
   * Allows selecting a variable from the database
   */
  variable: {
    type: 'string',
    title: 'Variable',
    description: 'Select a variable from the database',
    format: 'select',
    options: {
      source: 'database',
      type: 'variable',
      displayField: 'name',
      valueField: '_id'
    }
  },

  /**
   * Common event selection schema
   * Allows selecting a reusable common event from the database
   */
  commonEvent: {
    type: 'string',
    title: 'Common Event',
    description: 'Select a common event from the database',
    format: 'select',
    options: {
      source: 'database',
      type: 'commonEvent',
      displayField: 'name',
      valueField: '_id'
    }
  }
};

/**
 * Context types for block schemas
 * 
 * Different contexts can have different schema requirements and constraints.
 * This allows the same block to have different properties based on where
 * it's being used.
 */
export type BlockContext = 'event' | 'character' | 'enemy' | 'free' | 'custom';

/**
 * Context configuration for adapting block schemas
 * 
 * Each context can define how block schemas should be modified
 * for that specific use case.
 */
export interface BlockContextConfig {
  /**
   * Context identifier
   */
  context: BlockContext;
  
  /**
   * Event type this context is associated with (if applicable)
   */
  eventType?: EventType;
  
  /**
   * Schema modifications to apply to blocks in this context
   */
  schemaModifications: {
    /**
     * Properties to add or override for all blocks
     */
    global?: Record<string, any>;
    
    /**
     * Block-specific modifications
     */
    blocks?: Record<string, {
      /**
       * Properties to add or override for this specific block type
       */
      add?: Record<string, any>;
      
      /**
       * Properties to remove from this block type
       */
      remove?: string[];
      
      /**
       * Properties to make required for this block type
       */
      required?: string[];
      
      /**
       * Complete schema override for this block type
       */
      override?: Record<string, any>;
    }>;
  };
  
  /**
   * Block filtering rules
   */
  blockFiltering?: {
    /**
     * Block categories to include (if specified, only these categories are shown)
     */
    includeCategories?: string[];
    
    /**
     * Block categories to exclude
     */
    excludeCategories?: string[];
    
    /**
     * Specific block types to include
     */
    includeBlocks?: string[];
    
    /**
     * Specific block types to exclude
     */
    excludeBlocks?: string[];
  };
}

/**
 * Default context configurations for different event types
 */
export const defaultContextConfigs: Record<BlockContext, BlockContextConfig> = {
  event: {
    context: 'event',
    schemaModifications: {
      global: {}
    }
  },
  
  character: {
    context: 'character',
    eventType: 'character',
    schemaModifications: {
      global: {},
      blocks: {
        // Character-specific modifications for certain blocks
        'move_character': {},
        'change_character_graphic': {},
        
      }
    }
  },
  
  enemy: {
    context: 'enemy',
    eventType: 'enemy',
    schemaModifications: {
      global: {
        // Enemy-specific global properties
        monsterId: {
          type: 'string',
          title: 'Enemy ID',
          description: 'ID of the enemy this block affects'
        }
      },
      blocks: {
        // Enemy-specific modifications
        'move_character': {
          add: {
            characterId: {
              type: 'string',
              title: 'Enemy ID',
              description: 'ID of the enemy to move',
              default: 'current_monster'
            }
          },
          required: ['characterId']
        },
        'set_variable': {
          add: {
            variableScope: {
              type: 'string',
              title: 'Variable Scope',
              description: 'Scope of the variable to set',
              enum: ['global', 'monster', 'battle'],
              default: 'battle'
            }
          }
        }
      }
    },
    blockFiltering: {
      includeCategories: ['message', 'control', 'variable', 'character', 'scene', 'audio', 'system'],
      includeBlocks: ['wait', 'conditional_branch', 'loop', 'script']
    }
  },
  
  free: {
    context: 'free',
    eventType: 'free',
    schemaModifications: {
      global: {},
      blocks: {}
    },
    blockFiltering: {
      // Free events can use all blocks
    }
  },
  
  custom: {
    context: 'custom',
    schemaModifications: {
      global: {}
    }
  }
};

/**
 * Block context manager for adapting block schemas based on context
 * 
 * This class provides methods to modify block definitions and schemas
 * based on the current context (event type, usage scenario, etc.).
 * 
 * @example
 * ```typescript
 * const contextManager = new BlockContextManager();
 * 
 * // Get adapted block for character context
 * const characterBlock = contextManager.getAdaptedBlock(
 *   originalBlock, 
 *   'character'
 * );
 * 
   * // Get all blocks filtered for enemy context
   * const enemyBlocks = contextManager.getFilteredBlocks(
   *   allBlocks,
   *   'enemy'
   * );
 * ```
 */
export class BlockContextManager {
  private contextConfigs: Map<BlockContext, BlockContextConfig>;

  constructor(customConfigs?: Record<BlockContext, BlockContextConfig>) {
    this.contextConfigs = new Map();
    
    // Load default configs
    Object.entries(defaultContextConfigs).forEach(([context, config]) => {
      this.contextConfigs.set(context as BlockContext, config);
    });
    
    // Override with custom configs if provided
    if (customConfigs) {
      Object.entries(customConfigs).forEach(([context, config]) => {
        this.contextConfigs.set(context as BlockContext, config);
      });
    }
  }

  /**
   * Gets the context configuration for a specific context
   * 
   * @param context - The context to get configuration for
   * @returns The context configuration or undefined if not found
   * 
   * @example
   * ```typescript
   * const config = contextManager.getContextConfig('character');
   * if (config) {
   *   console.log('Character context config:', config);
   * }
   * ```
   */
  getContextConfig(context: BlockContext): BlockContextConfig | undefined {
    return this.contextConfigs.get(context);
  }

  /**
   * Adapts a block definition for a specific context
   * 
   * This method modifies the block's schema based on the context configuration,
   * adding, removing, or overriding properties as needed.
   * 
   * @param block - The original block definition
   * @param context - The context to adapt the block for
   * @returns A new block definition adapted for the context
   * 
   * @example
   * ```typescript
   * const originalBlock = { type: 'show_text', schema: { ... } };
   * const adaptedBlock = contextManager.getAdaptedBlock(originalBlock, 'character');
   * // The adapted block will have character-specific properties added
   * ```
   */
  getAdaptedBlock(block: BlockDefinition, context: BlockContext): BlockDefinition {
    const config = this.contextConfigs.get(context);
    if (!config) {
      return block;
    }

    let adaptedSchema: Record<string, unknown> = typeof block.schema === 'object' && block.schema !== null 
      ? { ...(block.schema as Record<string, unknown>) } 
      : {};

    // Apply global modifications
    if (config.schemaModifications.global) {
      adaptedSchema = mergeJsonSchemas(adaptedSchema, {
        properties: config.schemaModifications.global
      });
    }

    // Apply block-specific modifications
    const blockModifications = config.schemaModifications.blocks?.[block.type];
    if (blockModifications) {
      // Add properties
      if (blockModifications.add) {
        adaptedSchema = mergeJsonSchemas(adaptedSchema, {
          properties: blockModifications.add
        });
      }

      // Remove properties
      if (blockModifications.remove) {
        adaptedSchema = removeFromJsonSchema(adaptedSchema, {
          properties: blockModifications.remove
        });
      }

      // Add required properties
      if (blockModifications.required) {
        const currentRequired = (adaptedSchema['required'] as string[]) || [];
        adaptedSchema['required'] = [...new Set([...currentRequired, ...blockModifications.required])];
      }

      // Complete override
      if (blockModifications.override) {
        adaptedSchema = overrideJsonSchema(adaptedSchema, blockModifications.override);
      }
    }

    return {
      ...block,
      schema: adaptedSchema
    };
  }

  /**
   * Filters blocks based on context configuration
   * 
   * This method applies the filtering rules from the context configuration
   * to determine which blocks should be available in the current context.
   * 
   * @param blocks - Array of all available blocks
   * @param context - The context to filter for
   * @returns Array of blocks that should be available in this context
   * 
   * @example
   * ```typescript
   * const allBlocks = getAllBlocks();
   * const characterBlocks = contextManager.getFilteredBlocks(allBlocks, 'character');
   * // Returns only blocks that are appropriate for character events
   * ```
   */
  getFilteredBlocks(blocks: BlockDefinition[], context: BlockContext): BlockDefinition[] {
    const config = this.contextConfigs.get(context);
    if (!config || !config.blockFiltering) {
      return blocks;
    }

    const filtering = config.blockFiltering;

    return blocks.filter(block => {
      // Check category filtering
      if (filtering.includeCategories && !filtering.includeCategories.includes(block.category)) {
        return false;
      }
      
      if (filtering.excludeCategories && filtering.excludeCategories.includes(block.category)) {
        return false;
      }

      // Check block type filtering
      if (filtering.includeBlocks && !filtering.includeBlocks.includes(block.type)) {
        return false;
      }
      
      if (filtering.excludeBlocks && filtering.excludeBlocks.includes(block.type)) {
        return false;
      }

      return true;
    });
  }

  /**
   * Gets all blocks adapted and filtered for a specific context
   * 
   * This is a convenience method that combines filtering and adaptation
   * in a single call.
   * 
   * @param blocks - Array of all available blocks
   * @param context - The context to adapt and filter for
   * @returns Array of adapted and filtered blocks
   * 
   * @example
   * ```typescript
   * const allBlocks = getAllBlocks();
   * const enemyBlocks = contextManager.getContextBlocks(allBlocks, 'enemy');
   * // Returns enemy-appropriate blocks with adapted schemas
   * ```
   */
  getContextBlocks(blocks: BlockDefinition[], context: BlockContext): BlockDefinition[] {
    const filteredBlocks = this.getFilteredBlocks(blocks, context);
    return filteredBlocks.map(block => this.getAdaptedBlock(block, context));
  }

  /**
   * Gets context from event type
   * 
   * Maps event types to their corresponding block contexts.
   * 
   * @param eventType - The event type
   * @returns The corresponding block context
   * 
   * @example
   * ```typescript
   * const context = contextManager.getContextFromEventType('character');
   * // Returns 'character'
   * ```
   */
  getContextFromEventType(eventType: EventType): BlockContext {
    switch (eventType) {
      case 'character':
        return 'character';
      case 'enemy':
        return 'enemy';
      case 'free':
        return 'free';
      default:
        return 'event';
    }
  }

  /**
   * Gets context configuration from event type
   * 
   * Convenience method to get context configuration directly from event type.
   * 
   * @param eventType - The event type
   * @returns The context configuration for this event type
   * 
   * @example
   * ```typescript
   * const config = contextManager.getContextConfigFromEventType('enemy');
   * // Returns enemy context configuration
   * ```
   */
  getContextConfigFromEventType(eventType: EventType): BlockContextConfig | undefined {
    const context = this.getContextFromEventType(eventType);
    return this.getContextConfig(context);
  }

  /**
   * Adds or updates a custom context configuration
   * 
   * @param context - The context identifier
   * @param config - The context configuration
   * 
   * @example
   * ```typescript
   * contextManager.addContextConfig('shop', {
   *   context: 'shop',
   *   schemaModifications: {
   *     global: {
   *       shopId: { type: 'string', title: 'Shop ID' }
   *     }
   *   }
   * });
   * ```
   */
  addContextConfig(context: BlockContext, config: BlockContextConfig): void {
    this.contextConfigs.set(context, config);
  }

  /**
   * Removes a context configuration
   * 
   * @param context - The context to remove
   * 
   * @example
   * ```typescript
   * contextManager.removeContextConfig('custom');
   * ```
   */
  removeContextConfig(context: BlockContext): void {
    this.contextConfigs.delete(context);
  }

  /**
   * Gets all available contexts
   * 
   * @returns Array of all available context identifiers
   * 
   * @example
   * ```typescript
   * const contexts = contextManager.getAvailableContexts();
   * console.log('Available contexts:', contexts);
   * ```
   */
  getAvailableContexts(): BlockContext[] {
    return Array.from(this.contextConfigs.keys());
  }
}

/**
 * Global instance of the block context manager
 * 
 * This instance is pre-configured with default context configurations
 * and can be used throughout the application.
 * 
 * @example
 * ```typescript
 * import { blockContextManager } from '@common/blocks/context';
 * 
 * const characterBlocks = blockContextManager.getContextBlocks(allBlocks, 'character');
 * ```
 */
export const blockContextManager = new BlockContextManager();
