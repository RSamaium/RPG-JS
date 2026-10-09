import type {
  GameExecutionContext,
  ExecutionPlayer,
  ExecutionEvent
} from '../types';

// ============================================================================
// Development Logging
// ============================================================================

/**
 * Checks if the code is running in a local development environment
 * 
 * @returns true if running on localhost, false otherwise
 */
export function isLocalhost(): boolean {
  if (typeof window !== 'undefined') {
    return window.location.hostname === 'localhost' || 
           window.location.hostname === '127.0.0.1' ||
           window.location.hostname.startsWith('192.168.') ||
           window.location.hostname.startsWith('10.0.');
  }
  // Check for Node.js environment safely
  if (typeof globalThis !== 'undefined' && (globalThis as any).process && (globalThis as any).process.env) {
    const nodeEnv = (globalThis as any).process.env['NODE_ENV'];
    return nodeEnv === 'development' || nodeEnv !== 'production';
  }
  return false;
}

/**
 * Gets an emoji for a block type based on its category
 * 
 * @param blockType - The block type
 * @returns An emoji representing the block
 */
function getBlockEmoji(blockType: string): string {
  const emojiMap: Record<string, string> = {
    // Message blocks
    show_text: '💬',
    show_input: '⌨️',
    show_choices: '🔀',
    
    // Control blocks
    conditional_branch: '🔀',
    wait: '⏸️',
    
    // Variable blocks
    set_variable: '📝',
    set_switch: '🔘',
    change_gold: '💰',
    change_item: '📦',
    change_equipment: '🛡️',
    change_variable: '📊',
    
    // Character blocks
    move_character: '🚶',
    move_route: '🧭',
    change_character_graphic: '🎭',
    apply_graphic_animation: '🎞️',
    show_up_animation: '⬆️',
    
    // Audio blocks
    play_bgm: '🎵',
    play_se: '🔊',
    
    // System blocks
    comment: '💭',
    
    // Scene blocks
    show_animation: '✨',
  };
  
  return emojiMap[blockType] || '⚙️';
}

/**
 * Formats a block type name for display
 * 
 * @param blockType - The block type (snake_case)
 * @returns Formatted block name (Title Case)
 */
export function formatBlockName(blockType: string): string {
  return blockType
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Filters sensitive or verbose parameters from logs
 * 
 * @param params - The parameters object
 * @returns Filtered parameters object
 */
function filterSensitiveParams(params: Record<string, unknown>): Record<string, unknown> {
  const filtered: Record<string, unknown> = {};
  const excludeKeys = ['children', 'choiceChildren'];
  
  for (const [key, value] of Object.entries(params)) {
    if (!excludeKeys.includes(key)) {
      // Limit string length for readability
      if (typeof value === 'string' && value.length > 100) {
        filtered[key] = value.substring(0, 100) + '...';
      } else {
        filtered[key] = value;
      }
    }
  }
  
  return filtered;
}

/**
 * Logs block execution information in a beautiful format for development
 * 
 * @param blockType - The type of block being executed
 * @param blockId - The ID of the block
 * @param params - The block parameters
 * @param depth - The nesting depth (for indentation)
 * @param duration - Optional execution duration in milliseconds
 */
export function logBlockExecution(
  blockType: string,
  blockId: string | undefined,
  params: Record<string, unknown>,
  depth: number = 0,
  duration?: number
): void {
  if (!isLocalhost()) {
    return;
  }

  const indent = '  '.repeat(depth);
  const emoji = getBlockEmoji(blockType);
  const blockName = formatBlockName(blockType);
  const idStr = blockId ? ` [${blockId}]` : '';
  const durationStr = duration !== undefined ? ` ⏱️ ${duration.toFixed(2)}ms` : '';

  // Main block execution log
  console.group(
    `%c${indent}${emoji} ${blockName}${idStr}${durationStr}`,
    'color: #4CAF50; font-weight: bold; font-size: 13px;'
  );

  // Log parameters (filtered and formatted)
  const filteredParams = filterSensitiveParams(params);
  if (Object.keys(filteredParams).length > 0) {
    console.log(
      '%cParameters:',
      'color: #2196F3; font-weight: bold;',
      filteredParams
    );
  }

  // Log children count if present
  if (Array.isArray(params['children']) && params['children'].length > 0) {
    console.log(
      `%c📦 Children: ${params['children'].length} block(s)`,
      'color: #FF9800; font-weight: bold;'
    );
  }

  console.groupEnd();
}

/**
 * Logs the start of a block sequence execution
 * 
 * @param blockCount - Number of blocks to execute
 */
export function logBlockSequenceStart(blockCount: number): void {
  if (!isLocalhost()) {
    return;
  }

  console.log(
    '%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    'color: #9E9E9E;'
  );
  console.log(
    `%c🚀 Executing ${blockCount} block(s)`,
    'color: #4CAF50; font-weight: bold; font-size: 14px;'
  );
  console.log(
    '%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    'color: #9E9E9E;'
  );
}

/**
 * Logs the end of a block sequence execution
 * 
 * @param blockCount - Number of blocks executed
 * @param totalDuration - Total execution duration in milliseconds
 */
export function logBlockSequenceEnd(blockCount: number, totalDuration: number): void {
  if (!isLocalhost()) {
    return;
  }

  console.log(
    '%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    'color: #9E9E9E;'
  );
  console.log(
    `%c✅ Completed ${blockCount} block(s) in ${totalDuration.toFixed(2)}ms`,
    'color: #4CAF50; font-weight: bold; font-size: 14px;'
  );
  console.log(
    '%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    'color: #9E9E9E;'
  );
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Gets the value from params, either from a constant or a variable
 * 
 * This helper handles the common pattern where a value can come from
 * either a constant amount or from a variable reference.
 * 
 * @param context - The execution context
 * @param params - Parameters containing type, amount, and/or amountVariableId
 * @returns The resolved numeric value
 * 
 * @example
 * ```typescript
 * // With constant value
 * const amount = getValue(context, { type: 'constant', amount: 100 }); // 100
 * 
 * // With variable reference
 * const amount = getValue(context, { type: 'variable', amountVariableId: 'gold_bonus' });
 * ```
 */
export function getValue(
  context: GameExecutionContext,
  params: { type: 'constant' | 'variable'; amount?: number; amountVariableId?: string }
): number {
  if (params.type === 'constant') {
    return params.amount ?? 0;
  }
  const value = context.getVariable(params.amountVariableId ?? '');
  return typeof value === 'number' ? value : 0;
}

/**
 * Gets the quantity of an item in the player's inventory
 * 
 * This helper uses the player's items() method which returns an array,
 * and counts how many items match the given itemId.
 * 
 * @param player - The player object
 * @param itemId - The item ID to check
 * @returns The quantity of the item (0 if not found)
 * 
 * @example
 * ```typescript
 * const potionCount = getItemCount(context.player, 'potion');
 * if (potionCount >= 5) {
 *   // Player has at least 5 potions
 * }
 * ```
 */
export function getItemCount(player: ExecutionPlayer, itemId: string): number {
  // Use items() method which returns an array
  const items = (player as any).items?.();
  if (!Array.isArray(items)) {
    return 0;
  }
  
  // Count items matching the itemId
  return items.filter((item: any) => {
    return item?.id === itemId || item?.name === itemId || item?.itemId === itemId;
  }).length;
}

/**
 * Gets an event/character from the context based on eventId
 * 
 * Special values:
 * - '$player': Returns the current player
 * - '$this': Returns the current event
 * - Other: Looks up the event by ID in the game
 * 
 * @param context - The execution context
 * @param params - Parameters containing eventId
 * @returns The resolved event/character object
 * 
 * @example
 * ```typescript
 * const character = getEvent(context, { eventId: '$player' }); // Returns player
 * const npc = getEvent(context, { eventId: 'npc_001' }); // Returns NPC event
 * ```
 */
export function getEvent(
  context: Pick<GameExecutionContext, 'player' | 'event'> & Partial<Pick<GameExecutionContext, 'map'>>,
  params: { eventId?: string }
): ExecutionEvent | undefined {
  if (!params.eventId) {
    return undefined
  }
  if (params.eventId === '$player') {
    // Player implements ExecutionEvent interface
    return context.player as unknown as ExecutionEvent;
  }
  if (params.eventId === '$this') {
    return context.event;
  }
  // Get event from the current map
  const map =
    (context.event as any)?.getCurrentMap?.() ??
    (context.player as any)?.getCurrentMap?.() ??
    (context as any).map;
  if (map) {
    const event = map.getEvent?.(params.eventId);
    if (event) {
      return event as ExecutionEvent;
    }
  }
  throw new Error(`Event not found: ${params.eventId}`);
}

function readCoordinate(source: unknown, key: 'x' | 'y'): number | undefined {
  const value = (source as any)?.[key];
  const raw = typeof value === 'function' ? value.call(source) : value;
  const coordinate = Number(raw);
  return Number.isFinite(coordinate) ? coordinate : undefined;
}

/**
 * Converts a Studio target or RPGJS character into a plain map position.
 *
 * Server map animations are broadcast to clients, so their target must stay
 * serializable. RPGJS characters expose reactive x/y signals; forwarding the
 * character object itself would leak functions into the socket payload.
 */
export function getSerializablePosition(target: unknown): { x: number; y: number } | undefined {
  const x = readCoordinate(target, 'x');
  const y = readCoordinate(target, 'y');
  if (x !== undefined && y !== undefined) {
    return { x, y };
  }

  const positionValue = (target as any)?.position;
  const position = typeof positionValue === 'function' ? positionValue.call(target) : positionValue;
  const positionX = readCoordinate(position, 'x');
  const positionY = readCoordinate(position, 'y');
  if (positionX !== undefined && positionY !== undefined) {
    return { x: positionX, y: positionY };
  }

  return undefined;
}
