import type { BlockDefinition, AnyBlockDefinition, BlockType } from './types';
import {
  schemaShowText,
  schemaShowInput,
  schemaShowChoices,
  schemaShowNotification,
  schemaConditionalBranch,
  schemaQueryArea,
  schemaWait,
  schemaSetVariable,
  schemaSetSwitch,
  schemaSelfSwitch,
  schemaGold,
  schemaChangeHp,
  schemaChangeSp,
  schemaChangeExp,
  schemaChangeLevel,
  schemaCallCharacterSelect,
  schemaChangeClass,
  schemaChangeParameter,
  schemaRecoverAll,
  schemaChangeItem,
  schemaChangeEquipment,
  schemaChangeSkill,
  schemaUseSkill,
  schemaMoveRoute,
  schemaChangeCharacterGraphic,
  schemaSetHitbox,
  schemaApplyGraphicAnimation,
  schemaShowUpAnimation,
  schemaTransferPlayer,
  schemaShowAnimation,
  schemaCameraFollow,
  schemaSetWeather,
  schemaSetHotbar,
  schemaCallMainMenu,
  schemaCallGameover,
  schemaShowSave,
  schemaCallShop,
  schemaEraseEvent,
  schemaPlayBgm,
  schemaPlaySe,
  schemaCallCommonEvent,
  schemaSpawnCommonEvent
} from './executors/index';


/**
 * Default block definitions for RPG Maker-style event building
 * 
 * This array contains all the standard blocks available in the visual programming
 * system. These definitions are shared between the client UI, server-side processing,
 * and game engine execution.
 * 
 * @example
 * ```typescript
 * import { defaultBlocks } from '@common/blocks/definitions';
 * 
 * // Client-side: Register with BlockRegistryService
 * defaultBlocks.forEach(block => registry.register(block));
 * 
 * // Server-side: Use for AI generation context
 * const availableBlocks = defaultBlocks.map(b => ({ type: b.type, description: b.description }));
 * ```
 */
export const defaultBlocks = [
    // Message & Dialog Blocks
    schemaShowText,

    schemaShowInput,
  
    schemaShowChoices,

    schemaShowNotification,
  
    // Control Flow Blocks
    schemaConditionalBranch,

    schemaQueryArea,
  
    schemaWait,
  
    // Variable & Data Blocks
    schemaSetVariable,
  
    schemaSetSwitch,
  
    schemaSelfSwitch,
  
    schemaGold,
  
    schemaChangeHp,
  
    schemaChangeSp,
  
    schemaChangeExp,
  
    schemaChangeLevel,
  
    schemaChangeParameter,
  
    schemaRecoverAll,
  
    schemaChangeItem,

    schemaChangeEquipment,

    schemaChangeSkill,

    schemaUseSkill,
  
   
  
    // Character & Movement Blocks
    // {
    //   type: 'move_character',
    //   label: 'Move Character',
    //   description: 'Move a character to a specific position',
    //   category: 'character',
  
    //   icon: '🚶',
    //   schema: {
    //     type: 'object',
    //     properties: {
    //       eventId: {
    //         type: 'string',
    //         title: 'Event',
    //         description: 'Event to move',
    //         $ref: '#/functions/event'
    //       },
    //       movement: {
    //         type: 'object',
    //         title: 'Movement',
    //         properties: {
    //           type: {
    //             type: 'string',
    //             enum: ['to_position', 'direction', 'route'],
    //             default: 'to_position'
    //           },
    //           x: { type: 'number', title: 'X Position' },
    //           y: { type: 'number', title: 'Y Position' },
    //           direction: {
    //             type: 'string',
    //             enum: ['up', 'down', 'left', 'right'],
    //             title: 'Direction'
    //           },
    //           speed: {
    //             type: 'number',
    //             title: 'Movement Speed',
    //             minimum: 1,
    //             maximum: 6,
    //             default: 3
    //           }
    //         }
    //       },
    //       waitForCompletion: {
    //         type: 'boolean',
    //         title: 'Wait for Completion',
    //         default: true
    //       }
    //     },
    //     required: ['characterId', 'movement']
    //   }
    // },
  
    schemaMoveRoute,

    schemaChangeCharacterGraphic,

    schemaSetHitbox,
  
    schemaApplyGraphicAnimation,

    schemaShowUpAnimation,

    schemaCallCharacterSelect,

    schemaChangeClass,
  
    // Scene & Map Blocks
    schemaTransferPlayer,
  
    schemaShowAnimation,

    schemaCameraFollow,

    schemaSetWeather,

    schemaSetHotbar,

    schemaCallMainMenu,

    schemaCallGameover,

    schemaShowSave,

    schemaCallShop,

    schemaEraseEvent,
  
    // {
    //   type: 'change_screen_tone',
    //   label: 'Change Screen Tone',
    //   description: 'Tint the screen with a color effect',
    //   category: 'scene',
  
    //   icon: '🎨',
    //   schema: {
    //     type: 'object',
    //     properties: {
    //       red: {
    //         type: 'number',
    //         title: 'Red Tone',
    //         minimum: -255,
    //         maximum: 255,
    //         default: 0
    //       },
    //       green: {
    //         type: 'number',
    //         title: 'Green Tone',
    //         minimum: -255,
    //         maximum: 255,
    //         default: 0
    //       },
    //       blue: {
    //         type: 'number',
    //         title: 'Blue Tone',
    //         minimum: -255,
    //         maximum: 255,
    //         default: 0
    //       },
    //       gray: {
    //         type: 'number',
    //         title: 'Gray Tone',
    //         minimum: 0,
    //         maximum: 255,
    //         default: 0
    //       },
    //       duration: {
    //         type: 'number',
    //         title: 'Duration (seconds)',
    //         minimum: 0,
    //         default: 1
    //       }
    //     }
    //   }
    // },
  
    // Audio Blocks
    schemaPlayBgm,
  
    schemaPlaySe,

    // System Blocks
    schemaCallCommonEvent,

    schemaSpawnCommonEvent,
  ] as const;

  /**
 * Gets block definitions filtered by category
 * 
 * @param category - The category to filter by
 * @returns Array of block definitions in the specified category
 * 
 * @example
 * ```typescript
 * const messageBlocks = getBlocksByCategory('message');
 * console.log(messageBlocks.length); // Number of message blocks
 * ```
 */
export function getBlocksByCategory(category: string): AnyBlockDefinition[] {
    return defaultBlocks.filter(block => block.category === category);
  }
  
  /**
   * Gets all block definitions grouped by category
   * 
   * @returns Record of categories with their block definitions
   * 
   * @example
   * ```typescript
   * const categorized = getCategorizedBlocks();
   * console.log(categorized.control); // All control flow blocks
   * ```
   */
  export function getCategorizedBlocks(): Record<string, AnyBlockDefinition[]> {
    const categories: Record<string, AnyBlockDefinition[]> = {};
    
    defaultBlocks.forEach(block => {
      if (!categories[block.category]) {
        categories[block.category] = [];
      }
      categories[block.category].push(block);
    });
    
    return categories;
  }
  
  /**
   * Finds a block definition by its type
   * 
   * @typeParam T - The block type to find (for type inference)
   * @param type - The block type to find
   * @returns Block definition or undefined if not found
   * 
   * @example
   * ```typescript
   * const showTextBlock = findBlockByType('show_text');
   * if (showTextBlock) {
   *   console.log(showTextBlock.label); // "Show Text"
   * }
   * ```
   */
  export function findBlockByType<T extends BlockType>(type: T): BlockDefinition<T> | undefined {
    return defaultBlocks.find(block => block.type === type) as BlockDefinition<T> | undefined;
  }
  
