// ============================================================================
// Block Type Union
// ============================================================================

/**
 * Union of all supported block types
 * 
 * This type is automatically inferred from defaultBlocks in definitions.ts.
 * When adding a new block, you MUST:
 * 1. Add its definition to defaultBlocks in definitions.ts
 * 2. Add its params interface to BlockParamsMap
 * 3. Add its executor to defaultExecutors in executors.ts
 * 
 * The BlockType will be automatically updated from the block definitions.
 * 
 * @example
 * ```typescript
 * // Adding a new block type:
 * // 1. Add its definition to defaultBlocks in definitions.ts
 * // 2. Add its params interface to BlockParamsMap
 * // 3. Add its executor to defaultExecutors in executors.ts
 * // BlockType will be automatically inferred from defaultBlocks
 * ```
 */
// Import defaultBlocks to infer BlockType from it
// We use a type-only import to avoid circular dependencies at runtime
import type { defaultBlocks } from './blocks';
import type {
  WeatherState,
} from '../weather';

export type BlockType = typeof defaultBlocks[number]['type'];

// ============================================================================
// Block Parameter Interfaces
// ============================================================================

/**
 * Parameters for the show_text block
 * 
 * Displays a message dialog to the player with optional speaker name
 * and position configuration.
 */
export interface ShowTextParams {
  /** The text to display in the dialog */
  text: string;
  /** Name of the character speaking (optional) */
  speaker?: string;
  /** Position of the dialog on screen */
  position?: 'top' | 'middle' | 'bottom';
  /** Faceset to display (optional) */
  faceset?: string | { id?: string; facesetId?: string; expression?: string };
  /** Expression to display (optional) */
  expression?: string;
}

/**
 * Single choice option for show_choices block
 */
export interface ChoiceOption {
  /** Text displayed for this choice */
  text: string;
  /** Optional condition to show/hide this choice */
  condition?: string;
}

/**
 * Parameters for the show_choices block
 * 
 * Presents multiple choice options to the player and executes
 * different blocks based on the selection.
 */
export interface ShowChoicesParams {
  /** The question to ask the player */
  question: string;
  /** Array of choice options (2-4 choices) */
  choices: ChoiceOption[];
  /** Child blocks for each choice (indexed by choice index) */
  choiceChildren?: BlockInstance<BlockType>[][];
}

/**
 * Parameters for the show_notification block
 * 
 * Displays a notification message to the player.
 */
export interface ShowNotificationParams {
  /** Notification text to display */
  message: string;
  /** Duration in milliseconds */
  time?: number;
  /** Optional icon identifier */
  icon?: string;
  /** Optional sound identifier */
  sound?: string;
  /** Notification type */
  type?: 'info' | 'warn' | 'error';
}

/**
 * Parameters for the call_main_menu block
 * 
 * Opens the main menu with optional configuration.
 */
export interface CallMainMenuParams {
  /** Menu entries to show */
  menus?: Record<string, unknown>[];
  /** Menu entries to disable */
  disabledSave?: boolean;
  /** Save slots to display */
  saveSlots?: Record<string, unknown>[];
  /** Maximum save slots */
  saveMaxSlots?: number;
  /** Show auto slot */
  saveShowAutoSlot?: boolean;
  /** Auto slot index */
  saveAutoSlotIndex?: number;
  /** Auto slot label */
  saveAutoSlotLabel?: string;
}

/**
 * Parameters for the call_gameover block
 * 
 * Opens the game over interface with optional configuration.
 */
export interface CallGameoverParams {
  /** Gameover entries */
  entries?: Record<string, unknown>[];
  /** Main title */
  title?: string;
  /** Subtitle */
  subtitle?: string;
  /** Save/load options */
  saveLoad?: Record<string, unknown>;
  /** Restrict to local actions */
  localActions?: boolean;
}

/**
 * Parameters for the show_save block
 * 
 * Opens the save menu with optional slots and options.
 */
export interface ShowSaveParams {
  /** Save slots to display */
  slots?: Record<string, unknown>[];
  /** Additional options */
  options?: Record<string, unknown>;
}

/**
 * Parameters for the erase_event block
 * 
 * Removes an event from the map with optional animation.
 */
export interface EraseEventParams {
  /** ID of the event/character to erase */
  eventId: string;
  /** Optional animation spritesheet */
  animation?: string;
}

/**
 * Parameters for the call_shop block
 * 
 * Opens the shop interface with optional sell configuration.
 */
export interface CallShopParams {
  /** Items available for purchase */
  items: string[];
  /** Sell options */
  sell?: Record<string, number> | Array<{ id: string; multiplier: number }>;
  /** Default sell multiplier */
  sellMultiplier?: number;
  /** Shop message */
  message?: string;
  /** Face configuration */
  face?: string | { id: string; expression?: string };
}

/**
 * Comparison operators for variable conditions
 */
export type ComparisonOperator = 'equal' | 'not_equal' | 'greater' | 'greater_equal' | 'less' | 'less_equal';

/**
 * Condition types supported by conditional_branch
 */
export type ConditionType = 'switch' | 'self_switch' | 'variable' | 'player' | 'gold' | 'item' | 'level' | 'equipped' | 'custom';

/**
 * Player direction values
 */
export type Direction = 'up' | 'down' | 'left' | 'right';

/**
 * Player property types for conditions
 */
export type PlayerPropertyType = 'name' | 'direction' | 'position';

/**
 * Item comparison types
 */
export type ItemComparisonType = 'has' | 'not_has' | 'count_greater' | 'count_equal';

/**
 * Gold comparison types
 */
export type GoldComparisonType = 'greater_equal' | 'less_equal' | 'equal';

/**
 * Parameters for the conditional_branch block
 * 
 * Evaluates a condition and executes different blocks based on the result.
 * Supports various condition types: switch, self_switch, variable, player, gold, item, level, equipped, custom.
 */
export interface ConditionalBranchParams {
  /** Type of condition to evaluate */
  conditionType: ConditionType;
  
  // Switch condition fields
  /** Switch ID to check (when conditionType is 'switch') */
  switchId?: string;
  /** Expected switch state (when conditionType is 'switch') */
  switchValue?: boolean;
  
  // Self switch condition fields
  /** Self switch name to check (when conditionType is 'self_switch') */
  selfSwitchName?: 'A' | 'B' | 'C' | 'D' | 'E' | 'F';
  /** Expected self switch state (when conditionType is 'self_switch') */
  selfSwitchValue?: boolean;
  
  // Variable condition fields
  /** Variable ID to check (when conditionType is 'variable') */
  variableId?: string;
  /** Comparison operator (when conditionType is 'variable') */
  comparison?: ComparisonOperator;
  /** Value type: constant or variable (when conditionType is 'variable') */
  valueType?: 'constant' | 'variable';
  /** Constant value to compare against (when valueType is 'constant') */
  constantValue?: number;
  /** Variable ID to compare against (when valueType is 'variable') */
  compareVariableId?: string;
  
  // Player condition fields
  /** Player property to check (when conditionType is 'player') */
  playerProperty?: PlayerPropertyType;
  /** Expected player name (when playerProperty is 'name') */
  playerName?: string;
  /** Expected player direction (when playerProperty is 'direction') */
  playerDirection?: Direction;
  /** Expected X position (when playerProperty is 'position') */
  playerX?: number;
  /** Expected Y position (when playerProperty is 'position') */
  playerY?: number;
  
  // Gold condition fields
  /** Gold comparison operator (when conditionType is 'gold') */
  goldComparison?: GoldComparisonType;
  /** Gold value type: constant or variable (when conditionType is 'gold') */
  goldValueType?: 'constant' | 'variable';
  /** Gold amount to compare against (when goldValueType is 'constant') */
  goldAmount?: number;
  /** Variable ID containing gold amount (when goldValueType is 'variable') */
  goldVariableId?: string;
  /** Legacy condition string format */
  condition?: string;
  
  // Item condition fields
  /** Item ID to check (when conditionType is 'item') */
  itemId?: string;
  /** Item comparison type (when conditionType is 'item') */
  itemComparison?: ItemComparisonType;
  /** Item count for count comparisons */
  itemCount?: number;

  /** Expected equipped state (when conditionType is 'equipped') */
  equipped?: boolean;
  
  /** Child blocks to execute when condition is true */
  children?: BlockInstance<BlockType>[];
}

/**
 * Loop type options
 */
export type LoopType = 'count' | 'while' | 'infinite';

/**
 * Parameters for the loop block
 * 
 * Repeats child blocks based on count, condition, or infinitely.
 */
export interface LoopParams {
  /** Type of loop */
  type: LoopType;
  /** Number of iterations (when type is 'count') */
  count?: number;
  /** Condition expression (when type is 'while') */
  condition?: string;
}

/**
 * Parameters for the break_loop block
 * 
 * Exits the current loop immediately.
 */
export interface BreakLoopParams {
  // No parameters needed
}

/**
 * Parameters for the wait block
 * 
 * Pauses execution for a specified duration.
 */
export interface WaitParams {
  /** Duration to wait in seconds */
  duration: number;
}

/**
 * Variable operation types
 */
export type VariableOperation = 'set' | 'add' | 'subtract' | 'multiply' | 'divide' | 'modulo';

/**
 * Parameters for the set_variable block
 * 
 * Sets or modifies a game variable's value.
 */
export interface SetVariableParams {
  /** ID of the variable to modify */
  variableId: string;
  /** Operation to perform */
  operation: VariableOperation;
  /** Value to use (can be number, string, or expression) */
  value: string | number;
}

/**
 * Parameters for the set_switch block
 * 
 * Turns a game switch ON or OFF.
 */
export interface SetSwitchParams {
  /** Name/ID of the switch to control */
  switchName: string;
  /** Value to set (true = ON, false = OFF) */
  value: boolean;
}

/**
 * Parameters for the self_switch block
 * 
 * Turns a self switch ON or OFF.
 */
export interface SelfSwitchParams {
  /** Name of the self switch to control (A, B, C, D, E, or F) */
  switchName: 'A' | 'B' | 'C' | 'D' | 'E' | 'F';
  /** Value to set (true = ON, false = OFF) */
  value: boolean;
}

/**
 * Value modification type (constant or from variable)
 */
export type ValueModificationType = 'constant' | 'variable';

/**
 * Modification operation types for gold/variable changes
 */
export type ModificationOperation = 'set' | 'add' | 'sub' | 'mul' | 'div' | 'mod';

/**
 * Simple additive operations (set/add/sub)
 */
export type AdditiveOperation = 'set' | 'add' | 'sub';

/**
 * Parameters for the change_gold block
 * 
 * Modifies the player's gold amount.
 */
export interface ChangeGoldParams {
  /** Type of value source */
  type: ValueModificationType;
  /** Operation to perform */
  operation: ModificationOperation;
  /** Constant amount (when type is 'constant') */
  amount?: number;
  /** Variable ID containing amount (when type is 'variable') */
  amountVariableId?: string;
}

/**
 * Parameters for the change_hp block
 * 
 * Modifies the player's HP.
 */
export interface ChangeHpParams {
  /** Type of value source */
  type: ValueModificationType;
  /** Operation to perform */
  operation: AdditiveOperation;
  /** Constant amount (when type is 'constant') */
  amount?: number;
  /** Variable ID containing amount (when type is 'variable') */
  amountVariableId?: string;
}

/**
 * Parameters for the change_sp block
 * 
 * Modifies the player's SP.
 */
export interface ChangeSpParams {
  /** Type of value source */
  type: ValueModificationType;
  /** Operation to perform */
  operation: AdditiveOperation;
  /** Constant amount (when type is 'constant') */
  amount?: number;
  /** Variable ID containing amount (when type is 'variable') */
  amountVariableId?: string;
}

/**
 * Parameters for the change_exp block
 * 
 * Modifies the player's experience points.
 */
export interface ChangeExpParams {
  /** Type of value source */
  type: ValueModificationType;
  /** Operation to perform */
  operation: AdditiveOperation;
  /** Constant amount (when type is 'constant') */
  amount?: number;
  /** Variable ID containing amount (when type is 'variable') */
  amountVariableId?: string;
}

/**
 * Parameters for the change_level block
 * 
 * Modifies the player's level.
 */
export interface ChangeLevelParams {
  /** Type of value source */
  type: ValueModificationType;
  /** Operation to perform */
  operation: AdditiveOperation;
  /** Constant amount (when type is 'constant') */
  amount?: number;
  /** Variable ID containing amount (when type is 'variable') */
  amountVariableId?: string;
}

/**
 * Parameters for the change_parameter block
 * 
 * Modifies a player parameter modifier value.
 */
export interface ChangeParameterParams {
  /** Parameter ID to modify */
  parameterId: 'maxHp' | 'maxSp' | 'str' | 'agi' | 'int' | 'dex';
  /** Type of value source */
  type: ValueModificationType;
  /** Operation to perform */
  operation: AdditiveOperation;
  /** Constant amount (when type is 'constant') */
  amount?: number;
  /** Variable ID containing amount (when type is 'variable') */
  amountVariableId?: string;
}

/**
 * Parameters for the recover_all block
 */
export interface RecoverAllParams {}

/**
 * Item operation types
 */
export type ItemOperation = 'add' | 'remove';

/**
 * Parameters for the change_item block
 * 
 * Adds or removes items from the player's inventory.
 */
export interface ChangeItemParams {
  /** ID of the item to modify */
  itemId: string;
  /** Operation to perform */
  operation: ItemOperation;
  /** Type of amount source */
  amountType: ValueModificationType;
  /** Constant amount (when amountType is 'constant') */
  amount?: number;
  /** Variable ID containing amount (when amountType is 'variable') */
  amountVariableId?: string;
}

/**
 * Equipment slot types
 */
export type EquipmentSlot = 'weapon' | 'armor' | 'helmet' | 'gloves' | 'boots' | 'shield';

/**
 * Equipment operation types
 */
export type EquipmentOperation = 'equip' | 'unequip';

/**
 * Parameters for the change_equipment block
 * 
 * Equips or unequips an item on the player.
 */
export interface ChangeEquipmentParams {
  /** Operation to perform */
  operation: EquipmentOperation;
  /** Slot to change */
  slot: EquipmentSlot;
  /** Item to equip (required for equip) */
  itemId?: string;
}

/**
 * Parameters for changing player skills.
 */
export interface ChangeSkillParams {
  /** Skill to learn or forget */
  skillId: string;
  /** Whether to learn or forget the skill */
  state: 'learn' | 'forget';
}

/**
 * Parameters for using a player skill.
 */
export interface UseSkillParams {
  /** Skill to use */
  skillId: string;
}

/**
 * Parameters for the change_variable block
 * 
 * Modifies a variable value using various operations.
 */
export interface ChangeVariableParams {
  /** ID of the variable to modify */
  variableId: string;
  /** Type of value source */
  type: ValueModificationType;
  /** Operation to perform */
  operation: ModificationOperation;
  /** Constant amount (when type is 'constant') */
  amount?: number;
  /** Variable ID containing amount (when type is 'variable') */
  amountVariableId?: string;
}

/**
 * Movement type options
 */
export type MovementType = 'to_position' | 'direction' | 'route';

/**
 * Movement configuration for move_character block
 */
export interface MovementConfig {
  /** Type of movement */
  type: MovementType;
  /** X position (when type is 'to_position') */
  x?: number;
  /** Y position (when type is 'to_position') */
  y?: number;
  /** Direction to move (when type is 'direction') */
  direction?: Direction;
  /** Movement speed (1-6) */
  speed?: number;
  /** Route data (when type is 'route') */
  route?: unknown;
}

/**
 * Parameters for the move_character block
 * 
 * Moves a character to a specific position or in a direction.
 */
export interface MoveCharacterParams {
  /** ID of the event/character to move */
  eventId: string;
  /** Movement configuration */
  movement: MovementConfig;
  /** Whether to wait for movement completion */
  waitForCompletion?: boolean;
}

/**
 * Move route command types for move_route block
 */
export type MoveRouteCommandType =
  | 'move_down'
  | 'move_left'
  | 'move_right'
  | 'move_up'
  | 'move_random'
  | 'move_toward_player'
  | 'move_away_from_player'
  | 'turn_down'
  | 'turn_left'
  | 'turn_right'
  | 'turn_up'
  | 'turn_90_right'
  | 'turn_90_left'
  | 'turn_180'
  | 'turn_90_left_or_right'
  | 'turn_random'
  | 'turn_toward_player'
  | 'turn_away_from_player'
  | 'change_speed'
  | 'change_frequency'
  | 'set_visible'
  | 'set_move_animation'
  | 'set_direction_fix'
  | 'set_through'
  | 'set_always_on_top'
  | 'set_can_move'
  | 'set_through_other_player';

/**
 * Single route command for move_route block
 */
export interface MoveRouteCommand {
  /** Command action */
  action: MoveRouteCommandType;
  /** Optional command value (speed, frequency, or toggle value) */
  value?: string | boolean | number;
}

/**
 * Parameters for the move_route block
 * 
 * Defines a custom movement route for an event or player.
 */
export interface MoveRouteParams {
  /** ID of the event/character to move */
  eventId: string;
  /** Movement route commands */
  route: MoveRouteCommand[];
  /** Repeat the route endlessly */
  repeat?: boolean;
  /** Ignore if the character is blocked */
  ignoreIfBlocked?: boolean;
}

/**
 * Parameters for the change_character_graphic block
 * 
 * Changes the appearance of a character.
 */
export interface ChangeCharacterGraphicParams {
  /** ID of the event/character to modify */
  eventId: string;
  /** Path to the new spritesheet */
  spritesheet: string;
}

/**
 * Repeat behavior for apply_graphic_animation
 */
export type AnimationRepeatType = 'infinite' | 'count';

/**
 * Parameters for the apply_graphic_animation block
 * 
 * Changes the animation state of a character or event.
 */
export interface ApplyGraphicAnimationParams {
  /** ID of the event/character to animate */
  eventId: string;
  /** Animation name to apply */
  spritesheet: string;
  /** Repeat behavior */
  repeatType?: AnimationRepeatType;
  /** Number of times to play the animation (when repeatType is 'count') */
  repeatCount?: number;
}

/**
 * Animation target type for show_animation
 */
export type ShowAnimationTargetType = 'position' | 'event';

/**
 * Parameters for the show_animation block
 * 
 * Displays a spritesheet animation at a position or attached to an event.
 */
export interface ShowAnimationParams {
  /** Target type */
  targetType: ShowAnimationTargetType;
  /** Target position (when targetType is 'position') */
  position?: { x: number; y: number };
  /** Target event ID (when targetType is 'event') */
  eventId?: string;
  /** Spritesheet ID to use */
  spritesheet: string;
}

/**
 * Parameters for the show_up_animation block
 * 
 * Displays a component animation above the player with optional icon and sound.
 */
export interface ShowUpAnimationParams {
  /** Text to display (supports {variables}) */
  text: string;
  /** Optional icon to display before the text */
  icon?: string;
  /** Optional sound effect to play */
  sound?: string;
}

/**
 * Fade type for screen transitions
 */
export type FadeType = 'none' | 'black' | 'white';

/**
 * Parameters for the transfer_player block
 * 
 * Moves the player to a different map or location.
 */
export interface TransferPlayerParams {
  /** Destination map and position (new format using map-position field) */
  destination?: {
    mapId: string;
    x: number;
    y: number;
  };
  /** Map ID (legacy format, kept for backward compatibility) */
  mapId?: string;
  /** X position (legacy format, kept for backward compatibility) */
  x?: number;
  /** Y position (legacy format, kept for backward compatibility) */
  y?: number;
  /** Player direction after transfer */
  direction?: Direction;
  /** Transition effect type */
  fadeType?: FadeType;
}

/**
 * Parameters for the set_weather block
 *
 * Sets the full weather state on the current map.
 */
export interface SetWeatherParams extends WeatherState {
  /** Disable broadcast to connected players */
  sync?: boolean;
}

/**
 * Parameters for the change_screen_tone block
 * 
 * Tints the screen with a color effect.
 */
export interface ChangeScreenToneParams {
  /** Red tone (-255 to 255) */
  red?: number;
  /** Green tone (-255 to 255) */
  green?: number;
  /** Blue tone (-255 to 255) */
  blue?: number;
  /** Gray tone (0 to 255) */
  gray?: number;
  /** Duration of the transition in seconds */
  duration?: number;
}

/**
 * Parameters for the play_bgm block
 * 
 * Plays or changes the background music.
 */
export interface PlayBgmParams {
  /** Path to the music file */
  filename: string;
  /** Music file (alternative field name) */
  music?: string;
  /** Volume level (0-100) */
  volume?: number;
  /** Pitch adjustment (50-150) */
  pitch?: number;
  /** Fade in duration in seconds */
  fadeIn?: number;
}

/**
 * Parameters for the play_se block
 * 
 * Plays a sound effect.
 */
export interface PlaySeParams {
  /** Path to the sound effect file */
  filename?: string;
  /** Sound file (alternative field name) */
  sound?: string;
  /** Volume level (0-100) */
  volume?: number;
  /** Pitch adjustment (50-150) */
  pitch?: number;
}

/**
 * Parameters for the call_common_event block
 * 
 * Calls another event by ID.
 */
export interface CallCommonEventParams {
  /** ID of the common event to call */
  commonEventId: string;
  /** Parameters to pass to the event */
  parameters?: Record<string, unknown>;
  /** Recursion guard for nested common event calls */
  maxDepth?: number;
}

export interface CommonEventPositionParams {
  /** How to resolve the spawn position */
  positionMode?: 'current_event' | 'player' | 'explicit';
  /** Explicit X position */
  x?: number;
  /** Explicit Y position */
  y?: number;
}

/**
 * Parameters for the spawn_common_event block
 *
 * Spawns a visible common event on the current map.
 */
export interface SpawnCommonEventParams extends CommonEventPositionParams {
  /** ID of the common event to spawn */
  commonEventId: string;
  /** Runtime event mode */
  mode?: 'shared' | 'scenario';
}

/**
 * Parameters for the script block
 * 
 * Executes custom JavaScript code.
 */
export interface ScriptParams {
  /** JavaScript code to execute */
  code: string;
}

/**
 * Parameters for the comment block
 * 
 * Adds documentation (does not execute).
 */
export interface CommentParams {
  /** Comment text */
  text: string;
}

// ============================================================================
// Block Parameters Map
// ============================================================================

/**
 * Maps each BlockType to its corresponding parameters interface
 * 
 * This mapping ensures type safety when working with blocks:
 * - Block definitions reference the correct params type
 * - Executors receive properly typed parameters
 * - Block instances have correct data types
 * 
 * @example
 * ```typescript
 * // Get params type for a specific block
 * type ShowTextData = BlockParamsMap['show_text']; // ShowTextParams
 * 
 * // Use in generic functions
 * function getBlockParams<T extends BlockType>(type: T): BlockParamsMap[T] {
 *   // ...
 * }
 * ```
 */
export interface BlockParamsMap {
  // Message & Dialog
  show_text: ShowTextParams;
  show_choices: ShowChoicesParams;
  show_notification: ShowNotificationParams;
  
  // Control Flow
  conditional_branch: ConditionalBranchParams;
  loop: LoopParams;
  break_loop: BreakLoopParams;
  wait: WaitParams;
  
  // Variable & Data
  set_variable: SetVariableParams;
  set_switch: SetSwitchParams;
  self_switch: SelfSwitchParams;
  change_gold: ChangeGoldParams;
  change_item: ChangeItemParams;
  change_equipment: ChangeEquipmentParams;
  change_skill: ChangeSkillParams;
  use_skill: UseSkillParams;
  change_variable: ChangeVariableParams;
  change_hp: ChangeHpParams;
  change_sp: ChangeSpParams;
  change_exp: ChangeExpParams;
  change_level: ChangeLevelParams;
  change_parameter: ChangeParameterParams;
  recover_all: RecoverAllParams;
  
  // Character & Movement
  move_character: MoveCharacterParams;
  move_route: MoveRouteParams;
  change_character_graphic: ChangeCharacterGraphicParams;
  apply_graphic_animation: ApplyGraphicAnimationParams;
  show_up_animation: ShowUpAnimationParams;
  
  // Scene & Map
  transfer_player: TransferPlayerParams;
  set_weather: SetWeatherParams;
  change_screen_tone: ChangeScreenToneParams;
  show_animation: ShowAnimationParams;
  call_main_menu: CallMainMenuParams;
  call_gameover: CallGameoverParams;
  show_save: ShowSaveParams;
  call_shop: CallShopParams;
  erase_event: EraseEventParams;
  
  // Audio
  play_bgm: PlayBgmParams;
  play_se: PlaySeParams;
  
  // System
  call_common_event: CallCommonEventParams;
  spawn_common_event: SpawnCommonEventParams;
  script: ScriptParams;
  comment: CommentParams;
}

// ============================================================================
// Block Instance Type
// ============================================================================

/**
 * Represents a block instance at runtime
 * 
 * This interface defines the structure of blocks as they are stored
 * and executed. It provides type safety for the data field based on
 * the block type.
 * 
 * @typeParam T - The block type (from BlockType union)
 * 
 * @example
 * ```typescript
 * // Typed block instance
 * const textBlock: BlockInstance<'show_text'> = {
 *   id: 'block-1',
 *   type: 'show_text',
 *   data: {
 *     text: 'Hello!',
 *     position: 'bottom'
 *   }
 * };
 * 
 * // Generic block instance (for arrays of mixed blocks)
 * const blocks: BlockInstance<BlockType>[] = [textBlock, waitBlock];
 * ```
 */
export interface BlockInstance<T extends BlockType = BlockType> {
  /** Unique identifier for this block instance */
  id: string;
  /** The type of block */
  type: T;
  /** Block parameters/data */
  data: T extends keyof BlockParamsMap ? BlockParamsMap[T] : Record<string, unknown>;
  /** Child blocks (for blocks that support nesting) */
  children?: BlockInstance<BlockType>[];
}

/**
 * Type alias for any block instance
 * 
 * Use this when you need to work with blocks of any type.
 */
export type AnyBlockInstance = BlockInstance<BlockType>;

// ============================================================================
// Block Categories
// ============================================================================

/**
 * Categories for organizing blocks in the UI
 */
export type BlockCategory = 
  | 'message' 
  | 'control' 
  | 'variable' 
  | 'character' 
  | 'scene' 
  | 'audio' 
  | 'system'
  | 'custom';

// ============================================================================
// Block Definition
// ============================================================================

/**
 * Context information available to block conditions and schema adaptations
 * 
 * This interface provides the complete context information that can be used
 * to determine block availability and adapt block schemas.
 */
export interface BlockContextInfo {
  /** Event type (character, enemy, free) */
  eventType: import('../event-types').EventType;
  /** Event trigger (onInit, onAction, onChange, onTouch, etc.) or null */
  trigger: string | null;
  /** Collection ID being edited (optional) */
  collectionId?: string | null;
}

/**
 * Callback function to determine if a block should be available in a given context
 * 
 * @param context - The current context information
 * @returns True if the block should be available, false otherwise
 * 
 * @example
 * ```typescript
 * const condition: BlockContextCondition = (context) => {
 *   return context.eventType === 'enemy' && context.trigger === 'onAction';
 * };
 * ```
 */
export type BlockContextCondition = (context: BlockContextInfo) => boolean;

/**
 * Callback function to adapt a block's schema based on the current context
 * 
 * @param context - The current context information
 * @param schema - The base schema to adapt
 * @returns The adapted schema
 * 
 * @example
 * ```typescript
 * const adaptation: BlockSchemaAdaptation = (context, schema) => {
 *   if (context.trigger === 'onBattleStart') {
 *     return {
 *       ...schema,
 *       properties: {
 *         ...schema.properties,
 *         autoStart: { type: 'boolean', title: 'Auto Start', default: true }
 *       }
 *     };
 *   }
 *   return schema;
 * };
 * ```
 */
export type BlockSchemaAdaptation = (context: BlockContextInfo, schema: any) => any;

/**
 * Definition of a block that can be used in the event builder
 * 
 * This interface defines the structure of blocks used in the visual programming
 * system for creating game events. Each block represents a specific action or
 * control structure that can be executed in the game engine.
 * 
 * The generic type parameter ensures that the `type` field is constrained
 * to valid block types.
 * 
 * @typeParam T - The block type (from BlockType union)
 * 
 * @example
 * ```typescript
 * const showTextBlock: BlockDefinition<'show_text'> = {
 *   type: 'show_text',
 *   label: 'Show Text',
 *   description: 'Display a message dialog to the player',
 *   category: 'message',
 *   icon: '💬',
 *   schema: {
 *     type: 'object',
 *     properties: {
 *       text: { type: 'string', title: 'Message Text' }
 *     }
 *   }
 * };
 * ```
 */
export interface BlockDefinition<T extends string = string> {
  /** Unique identifier for the block type */
  type: T;
  /** Human-readable label displayed in the UI */
  label: string;
  /** Optional description explaining what the block does */
  description?: string;
  /** Category for organizing blocks in the UI */
  category: BlockCategory;
  /** Icon or emoji representing the block */
  icon: string;
  /** JSON Schema defining the block's configuration properties */
  schema?: unknown;
  /** Input connection points for the block */
  inputs?: readonly string[] | string[];
  /** Output connection points for the block */
  outputs?: readonly string[] | string[];
  /** Whether this block can contain child blocks */
  canHaveChildren?: boolean;
  /** Optional condition callback to determine if the block should be available in a given context */
  contextCondition?: BlockContextCondition;
  /** Optional callback to adapt the block's schema based on the current context */
  schemaAdaptation?: BlockSchemaAdaptation;
}

/**
 * Type alias for any block definition
 * 
 * Use this when working with arrays of mixed block definitions.
 */
export type AnyBlockDefinition = BlockDefinition<BlockType> | BlockDefinition;

// ============================================================================
// Game Execution Context
// ============================================================================

/**
 * Interface for a player-like object in the execution context
 * 
 * This interface defines the minimum required methods and properties
 * that a player object must have to be used in block execution.
 * It is designed to be compatible with RpgPlayer from @rpgjs/server.
 */
export interface ExecutionPlayer {
  /** Display a text dialog */
  showText(text: string, options?: { talkWith?: unknown; position?: string }): Promise<void>;
  /** Display choices and get player selection */
  showChoices(question: string, choices: Array<{ text: string; value: number }>): Promise<{ value: number }>;
  /** Get a variable value */
  getVariable(variableId: string): unknown;
  /** Set a variable value */
  setVariable(variableId: string, value: unknown): void;
  /** Player name */
  name?: string;
  /** Player direction */
  direction?: string;
  /** Player X position */
  x?(): number;
  /** Player Y position */
  y?(): number;
  /** Check if player has an item */
  hasItem(itemId: string): boolean;
  /** Get the quantity of an item in player's inventory */
  getItemCount(itemId: string): number;
  /** Add an item to inventory */
  addItem(itemId: string, amount: number): void;
  /** Remove an item from inventory */
  removeItem(itemId: string, amount: number): void;
  /** Equip an item in a specific slot */
  equip?(slot: EquipmentSlot | string, itemId: string): void;
  /** Unequip an item from a specific slot */
  unequip?(slot: EquipmentSlot | string): void;
  /** Set equipment in a specific slot */
  setEquipment?(slot: EquipmentSlot | string, itemId: string | null): void;
  /** Set equipment in a specific slot (alias) */
  setEquip?(slot: EquipmentSlot | string, itemId: string | null): void;
  /** Clear equipment in a specific slot */
  clearEquipment?(slot: EquipmentSlot | string): void;
  /** Player's gold amount */
  gold: number;
  /** Player level */
  level?: number;
  /** Get player level */
  getLevel?(): number;
  /** Change to a different map */
  changeMap(mapId: string, position: { x: number; y: number }): Promise<void>;
  /** Set the current animation */
  setAnimation?(animationName: string, repeatCount?: number): Promise<void> | void;
  /** Lock automatic animation changes */
  animationFixed?: boolean;
  /** Display a component animation on the player */
  showComponentAnimation?(id: string, params: unknown): Promise<void> | void;
}

/**
 * Interface for an event-like object in the execution context
 * 
 * This interface defines the minimum required methods for event objects
 * used in block execution. Compatible with RpgEvent from @rpgjs/server.
 */
export interface ExecutionEvent {
  /** Event ID */
  id?: string;
  /** Move to a position */
  moveTo(position: { x: number; y: number }): Promise<void>;
  /** Move in a direction */
  moveDirection?(direction: string, speed: number): Promise<void>;
  /** Follow a route */
  followRoute?(route: unknown, speed: number): Promise<void>;
  /** Set the graphic/spritesheet */
  setGraphic(spritesheet: string): Promise<void>;
  /** Set the current animation */
  setAnimation?(animationName: string, repeatCount?: number): Promise<void> | void;
  /** Show a spritesheet animation attached to the event */
  showAnimation?(graphic: string, animationName?: string): Promise<void> | void;
  /** Event world X position */
  x?: number;
  /** Event world Y position */
  y?: number;
  /** Optional position object */
  position?: { x: number; y: number };
}

/**
 * Interface for game-level operations in the execution context
 */
export interface ExecutionGame {
  /** Wait for a duration in milliseconds */
  wait(duration: number): Promise<void>;
  /** Get an event by ID */
  getEvent(eventId: string): ExecutionEvent | undefined;
  /** Change screen tone */
  changeScreenTone?(options: {
    red: number;
    green: number;
    blue: number;
    gray: number;
    duration: number;
  }): Promise<void>;
  /** Audio system */
  audio?: {
    playBGM(options: { filename: string; volume: number; pitch: number; fadeIn: number }): Promise<void>;
    playSE(options: { filename: string; volume: number; pitch: number }): Promise<void>;
  };
}

/**
 * Runtime executor registry that can hold any block executor
 * 
 * This type is more permissive than BlockExecutorRegistry and is used
 * at runtime when we need to pass executors around without strict typing.
 * 
 * Note: We use `unknown` for the context type here to avoid circular references.
 * At runtime, this will be a GameExecutionContext.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type RuntimeBlockExecutorRegistry = Record<string, (context: any, params: Record<string, unknown>) => Promise<void> | void>;

/**
 * Game context for block execution
 * 
 * This interface defines the context object passed to block executors,
 * containing game state, player information, and utility functions.
 * 
 * The player and event fields are generic to allow direct use of RpgPlayer and RpgEvent
 * without requiring adapters.
 * 
 * @example
 * ```typescript
 * const context: GameExecutionContext = {
 *   player: currentPlayer, // RpgPlayer instance
 *   event: currentEvent,   // RpgEvent instance
 *   // ... utility functions
 * };
 * ```
 */
export interface GameExecutionContext {
  /** Current player instance (RpgPlayer or compatible) */
  player: ExecutionPlayer | any;
  /** Current event instance (RpgEvent or compatible) */
  event: ExecutionEvent | any;
  /** Reference to executors for recursive execution */
  executors?: RuntimeBlockExecutorRegistry;
  /** Resolve a common event database record by id */
  getCommonEvent?(commonEventId: string): Promise<unknown> | unknown;
  /** Spawn a common event on the current map */
  spawnCommonEvent?(
    commonEventId: string,
    position: { x: number; y: number },
    options?: { mode?: 'shared' | 'scenario' }
  ): Promise<void> | void;
  /** Current common event recursion state */
  commonEventExecutionState?: {
    depth: number;
    parameters: Record<string, unknown>;
  };
  
  // Variable/Switch operations
  /** Get a game variable value */
  getVariable(variableId: string): unknown;
  /** Set a game variable value */
  setVariable(variableId: string, value: unknown): void;
  /** Get a switch value */
  getSwitch(switchId: string): boolean;
  /** Set a switch value */
  setSwitch(switchId: string, value: boolean): void;
  
  // Control flow operations
  /** Set branch result for conditional blocks */
  setBranchResult(result: boolean): void;
  /** Set loop count */
  setLoopCount(count: number): void;
  /** Set loop condition */
  setLoopCondition(condition: string): void;
  /** Break current loop */
  breakLoop(): void;
  
  // Advanced operations
  /** Evaluate a condition expression safely */
  evaluateCondition(condition: string): boolean;
  /** Call another event */
  callEvent(eventId: string, parameters: Record<string, unknown>): Promise<void>;
  /** Execute custom script */
  executeScript(code: string): Promise<void>;

  /** Move API */
  moveApi: any;
}

// ============================================================================
// Block Executor Types
// ============================================================================

/**
 * Callback function executed when a block is processed in the game engine
 * 
 * This is a strongly-typed executor that receives the correct params type
 * based on the block type.
 * 
 * @typeParam T - The block type
 * @param context - The current execution context
 * @param params - Parameters configured for this block instance
 * @returns Promise that resolves when the block execution is complete
 * 
 * @example
 * ```typescript
 * const showTextExecutor: BlockExecutor<'show_text'> = async (context, params) => {
 *   // params is typed as ShowTextParams
 *   await context.player.showText(params.text, {
 *     position: params.position
 *   });
 * };
 * ```
 */
export type BlockExecutor<T extends BlockType & keyof BlockParamsMap> = (
  context: GameExecutionContext,
  params: BlockParamsMap[T]
) => Promise<void> | void;

/**
 * Registry mapping block types to their execution functions
 * 
 * This type ensures that all block types have corresponding executors
 * with correctly typed parameters.
 * 
 * @typeParam T - The block type union (defaults to BlockType)
 * 
 * @example
 * ```typescript
 * const executors: BlockExecutorRegistry = {
 *   show_text: async (context, params) => {
 *     // params is ShowTextParams
 *     await context.player.showText(params.text);
 *   },
 *   wait: async (context, params) => {
 *     // params is WaitParams
 *     await new Promise(resolve => setTimeout(resolve, params.duration * 1000));
 *   }
 * };
 * ```
 */
export type BlockExecutorRegistry<T extends BlockType = BlockType> = {
  [K in T]: BlockExecutor<K>;
};

/**
 * Partial executor registry for custom executors
 * 
 * Use this type when adding custom executors that don't cover all block types.
 */
export type PartialBlockExecutorRegistry = Partial<BlockExecutorRegistry<BlockType>>;
