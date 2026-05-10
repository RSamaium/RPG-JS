import {
  defaultExecutors,
  createExecutorRegistry,
  executeBlock,
  executeBlocksRecursively,
  GameExecutionContext,
  RuntimeBlockExecutorRegistry,
  PartialBlockExecutorRegistry,
  AnyBlockInstance,
  BlockType,
  BlockParamsMap
} from '@common/blocks';
import { Move, RpgEvent, RpgPlayer } from '@rpgjs/server';

// ============================================================================
// Block Execution Service
// ============================================================================

/**
 * Block execution service for the RPGJS game engine
 * 
 * This service handles the execution of visual programming blocks within the game.
 * It provides the bridge between the block definitions and the actual game functionality,
 * with full type safety for block parameters and execution context.
 * 
 * The service creates a strongly-typed execution context that implements
 * `GameExecutionContext` from the common blocks module.
 * 
 * @example
 * ```typescript
 * // Create the service with player and event
 * const executor = new BlockExecutionService(player, event);
 * 
 * // Execute a sequence of typed blocks
 * const blocks: AnyBlockInstance[] = [
 *   { id: '1', type: 'show_text', data: { text: 'Hello!' } },
 *   { id: '2', type: 'wait', data: { duration: 2 } }
 * ];
 * await executor.executeBlockSequence(blocks);
 * ```
 */
export class BlockExecutionService {
  private context: GameExecutionContext;
  private executors: RuntimeBlockExecutorRegistry;
  
  // Internal state for control flow
  private variables = new Map<string, unknown>();
  private switches = new Map<string, boolean>();

  /**
   * Creates a new BlockExecutionService
   * 
   * @param player - The RpgPlayer instance for this execution context
   * @param event - The RpgEvent instance (the current event being executed)
   */
  constructor(player: RpgPlayer, event: RpgEvent) {
    this.executors = createExecutorRegistry();
    this.context = this.createGameContext(player, event);
  }

  /**
   * Executes a sequence of blocks
   * 
   * This method iterates through the provided blocks and executes each one
   * in sequence. If a block has children, they are handled by the individual
   * block executors (e.g., conditional_branch, show_choices).
   * 
   * @param blocks - Array of block instances to execute
   * @returns Promise that resolves when all blocks are executed
   * 
   * @example
   * ```typescript
   * const blocks: AnyBlockInstance[] = [
   *   { id: '1', type: 'show_text', data: { text: 'Welcome!' } },
   *   { id: '2', type: 'wait', data: { duration: 1 } },
   *   { id: '3', type: 'show_text', data: { text: 'Goodbye!' } }
   * ];
   * await executor.executeBlockSequence(blocks);
   * ```
   */
  async executeBlockSequence(blocks: AnyBlockInstance[]): Promise<void> {
    await executeBlocksRecursively(blocks, this.context, this.executors);
  }

  /**
   * Executes a single block
   * 
   * @typeParam T - The block type for type inference
   * @param block - Block instance to execute
   * @returns Promise that resolves when block is executed
   * 
   * @example
   * ```typescript
   * await executor.executeSingleBlock({
   *   id: 'unique-id',
   *   type: 'show_text',
   *   data: { text: 'Hello World!', position: 'bottom' }
   * });
   * ```
   */
  async executeSingleBlock<T extends BlockType>(
    block: { id: string; type: T; data: BlockParamsMap[T] }
  ): Promise<void> {
    await executeBlock(block.type, this.context, block.data, this.executors);
  }

  /**
   * Adds custom block executors
   * 
   * Custom executors can override default behavior or add new block types.
   * The executors are merged with the default executors, with custom ones
   * taking precedence.
   * 
   * @param customExecutors - Object mapping block types to executor functions
   * 
   * @example
   * ```typescript
   * executor.addCustomExecutors({
   *   // Override show_text behavior
   *   show_text: async (context, params) => {
   *     console.log('Custom show_text:', params.text);
   *     await context.player.showText(params.text);
   *   },
   *   // Add a custom block type
   *   my_custom_block: async (context, params) => {
   *     console.log('Custom block executed!', params);
   *   }
   * });
   * ```
   */
  addCustomExecutors(customExecutors: PartialBlockExecutorRegistry): void {
    this.executors = createExecutorRegistry(customExecutors);
    // Update context with new executors
    this.context.executors = this.executors;
  }

  /**
   * Creates the game execution context
   * 
   * This method builds a `GameExecutionContext` with only player and event,
   * along with utility functions for block execution.
   * 
   * @param player - Current player instance
   * @param event - Current event instance
   * @returns Game execution context with player and event
   */
  private createGameContext(player: RpgPlayer, event: RpgEvent): GameExecutionContext {
    return {
      player: player,
      event: event,
      executors: this.executors,
      moveApi: Move,
     
      // Switch operations
      getVariable: (variableId: string): unknown => {
        if (typeof player.getVariable === 'function') {
          return player.getVariable(variableId);
        }
        return this.variables.get(variableId);
      },

      setVariable: (variableId: string, value: unknown): void => {
        if (typeof player.setVariable === 'function') {
          player.setVariable(variableId, value);
        } else {
          this.variables.set(variableId, value);
        }
      },

      getSwitch: (switchId: string): boolean => {
        return this.switches.get(switchId) ?? false;
      },
      
      setSwitch: (switchId: string, value: boolean): void => {
        this.switches.set(switchId, value);
      },
      
      // Control flow operations
      setBranchResult: (result: boolean): void => {
        this.variables.set('__lastBranchResult', result);
      },
      
      setLoopCount: (count: number): void => {
        this.variables.set('__loopCount', count);
      },
      
      setLoopCondition: (condition: string): void => {
        this.variables.set('__loopCondition', condition);
      },
      
      breakLoop: (): void => {
        this.variables.set('__breakLoop', true);
      },
      
      // Advanced operations
      evaluateCondition: (condition: string): boolean => {
        try {
          // Simple condition evaluation - in production, use a safer evaluator
          const evalFunc = new Function(
            'variables',
            'switches',
            'player',
            `return ${condition}`
          );
          return evalFunc(
            Object.fromEntries(this.variables),
            Object.fromEntries(this.switches),
            player
          );
        } catch (error) {
          console.warn('Error evaluating condition:', condition, error);
          return false;
        }
      },
      
      callEvent: async (eventId: string, parameters: Record<string, unknown>): Promise<void> => {
        // Call another event - implement based on your event system
        const targetEvent = event.getCurrentMap?.()?.getEvent?.(eventId);
        if (targetEvent && typeof (targetEvent as any).callEvent === 'function') {
          await (targetEvent as any).callEvent(eventId, parameters);
        }
      },
      
      executeScript: async (code: string): Promise<void> => {
        try {
          // Execute custom script safely - implement proper sandboxing in production
          const func = new Function('context', 'player', 'event', code);
          await func(this.context, player, event);
        } catch (error) {
          console.error('Error executing script:', error);
          throw error;
        }
      },
    };
  }

  /**
   * Gets the current execution context
   * 
   * @returns Current game execution context
   * 
   * @example
   * ```typescript
   * const context = executor.getContext();
   * console.log('Current player gold:', context.player.gold);
   * ```
   */
  getContext(): GameExecutionContext {
    return this.context;
  }

  /**
   * Gets a variable value from the execution context
   * 
   * @param variableId - The variable ID to get
   * @returns The variable value or undefined
   * 
   * @example
   * ```typescript
   * const score = executor.getVariable('player_score');
   * console.log('Player score:', score);
   * ```
   */
  getVariable(variableId: string): unknown {
    return this.context.getVariable(variableId);
  }

  /**
   * Sets a variable value in the execution context
   * 
   * @param variableId - The variable ID to set
   * @param value - The value to set
   * 
   * @example
   * ```typescript
   * executor.setVariable('player_score', 100);
   * ```
   */
  setVariable(variableId: string, value: unknown): void {
    this.context.setVariable(variableId, value);
  }

  /**
   * Gets a switch value from the execution context
   * 
   * @param switchId - The switch ID to get
   * @returns The switch value (true/false)
   * 
   * @example
   * ```typescript
   * const isQuestComplete = executor.getSwitch('quest_001_complete');
   * ```
   */
  getSwitch(switchId: string): boolean {
    return this.context.getSwitch(switchId);
  }

  /**
   * Sets a switch value in the execution context
   * 
   * @param switchId - The switch ID to set
   * @param value - The value to set (true/false)
   * 
   * @example
   * ```typescript
   * executor.setSwitch('quest_001_complete', true);
   * ```
   */
  setSwitch(switchId: string, value: boolean): void {
    this.context.setSwitch(switchId, value);
  }

  /**
   * Clears all local variables and switches
   * 
   * This resets the execution state while preserving player-level variables.
   * 
   * @example
   * ```typescript
   * executor.clearState();
   * ```
   */
  clearState(): void {
    this.variables.clear();
    this.switches.clear();
  }
}
