import { Observable, of, switchMap, from, throwError, timeout, map } from "rxjs"
import type { Block, BlockExecuteReturn, Parameters } from "./types/block"
import type { Edge } from "./types/edge"
import { formatMessage } from "./format-message"
import blocks, { Flow } from "./blocks"
import type { RpgPlayer } from "@rpgjs/server"
import { jsonSchemaToZod } from './validate';
import { z, ZodError } from 'zod';

export class RpgInterpreter {
    private blocksById: { [key: string]: Block } = {}
    private executionHistory: { blockId: string, data: any }[] = []
    private recursionLimit = 1000; // set the recursion limit
    private currentRecursionDepth = 0; // track the current recursion depth
    private executionTimeout = 5000; // set the execution timeout in milliseconds
    private parametersSchema?: Parameters

    constructor(
        private dataBlocks: Flow,
        private edges: Edge,
        options: {
            recursionLimit?: number;
            executionTimeout?: number;
            parametersSchema?: (formatMessage?) => Parameters
        } = {},
        _formatMessage = formatMessage
    ) {
        this.recursionLimit = options.recursionLimit || this.recursionLimit;
        this.executionTimeout = options.executionTimeout || this.executionTimeout;
        this.parametersSchema = options.parametersSchema?.(_formatMessage)
        blocks.forEach(block => {
            const _blocks = block(_formatMessage)
            this.blocksById[_blocks.id] = _blocks
        })
    }

    private getBlock(id: string): Block {
        return this.blocksById[id]
    }

    /**
      * Start the RPG interpreter.
      *
      * @param {Object} params - The start parameters.
      * @param {RpgPlayer} params.player - The RPG player.
      * @param {string} params.blockId - The block ID to start from.
      *
      * @return {Observable<any>} The RPG interpreter execution as an Observable.
      */
    start({ player, blockId, parameters }: { player: RpgPlayer, blockId: string, parameters?}): Observable<any> {
        const validateParams = this.validateParameters(parameters)
        if (validateParams === null) {
            const validate = this.validateFlow(blockId)
            if (validate === null) {
                return this.executeFlow(player, blockId, parameters)
            }
            return throwError(() => validate)
        }
        return throwError(() => validateParams)
    }

    getHistory() {
        return this.executionHistory
    }

    validateParameters(parameters: any): ZodError | null {
        if (this.parametersSchema) {
            const schemaZod = z.object(jsonSchemaToZod(this.parametersSchema));
            const parse = schemaZod.safeParse(parameters);
            if (!parse.success) {
                return parse.error
            }
        }
        return null
    }

    /**
     * Validate a block.
     *
     * @param {string} blockId - The block ID to validate.
     *
     * @return {ZodError | null} The validation error or null if validation passed.
     */
    validateBlock(blockId: string): ZodError | null {
        const dataBlock = this.dataBlocks[blockId];

        if (!dataBlock) {
            return new ZodError([
                {
                    message: `${blockId} id does not exist.`,
                    code: 'custom',
                    path: ['id']
                }
            ])
        }

        const block = this.getBlock(dataBlock.id);

        if (!block) {
            return new ZodError([
                {
                    message: `${dataBlock.id} block does not exist.`,
                    code: 'custom',
                    path: ['schema']
                }
            ])
        }

        const schemaZod = z.object(jsonSchemaToZod(block.schema));

        const parse = schemaZod.safeParse(dataBlock);

        if (!parse.success) {
            return parse.error;
        }

        return null
    }

    /**
    * Get the next blocks by edge.
    *
    * @param {string} blockId - The block ID.
    * @param {string} [handleId] - The handle ID.
    *
    * @return {string[]} The next block IDs.
    */
    getNextBlocksByEdge(blockId: string, handleId?: string): string[] {
        const edge = this.edges[blockId];

        if (!edge) {
            return [];
        }

        if (typeof edge == 'object' && 'blocks' in edge) {
            if (handleId) {
                const handle = edge.blocks.find(edge => edge.handle === handleId);
                if (handle) {
                    return [handle.blockId];
                }
            }
            return edge.blocks.map(edge => edge.blockId);
        }

        if (Array.isArray(edge)) {
            return edge;
        }

        return [edge]
    }

    /**
     * Validate a flow.
     *
     * @param {string} blockId - The block ID.
     * @param {Object} [diagnotics={}] - The diagnostics.
     *
     * @return {Object | null} The validation result.
     */
    validateFlow(blockId: string, diagnotics = {}): { [blockId: string]: ZodError } | null {
        const recursiveValidate = (blockId, diagnotics) => {
            // Validate the initial block
            const validate = this.validateBlock(blockId)

            if (validate !== null) {
                diagnotics[blockId] = validate;
            }

            // Get the next block(s) in the flow
            const nextBlockIds = this.getNextBlocksByEdge(blockId);

            // If there are no more blocks in the flow, return true
            if (nextBlockIds.length === 0) {
                return diagnotics;
            }

            // If there are multiple next blocks, validate all of them and return false if any of them is invalid
            if (Array.isArray(nextBlockIds)) {
                for (let nextBlockId of nextBlockIds) {
                    const validate = this.validateBlock(nextBlockId)

                    if (validate !== null) {
                        diagnotics[nextBlockId] = validate;
                    }
                }
                return diagnotics;
            }

            // If there is one next block, validate it
            return recursiveValidate(nextBlockIds, diagnotics);
        }
        const val = recursiveValidate(blockId, diagnotics)
        return Object.keys(val).length ? val : null;
    }

    /**
     * Execute a flow.
     *
     * @param {RpgPlayer} player - The RPG player.
     * @param {string} blockId - The block ID to start from.
     *
     * @return {Observable<any>} The flow execution as an Observable.
     */
    private executeFlow(player: RpgPlayer, blockId: string, parameters?: Parameters): Observable<any> {
        // Prevent recursion beyond the limit
        if (this.currentRecursionDepth++ > this.recursionLimit) {
            return throwError(() => new Error('Recursion limit exceeded'));
        }

        // This function recursively executes the flow starting from the given blockId
        return this.executeBlock(player, blockId).pipe(
            switchMap((handleId) => {
                const nextBlocks = this.getNextBlocksByEdge(blockId, handleId);
                if (nextBlocks.length !== 0) {
                    return of(...nextBlocks)
                        .pipe(
                            switchMap(nextBlockId => this.executeFlow(player, nextBlockId)
                            )
                        )
                } else {
                    // If there are no more blocks, return an observable that completes immediately
                    return of(null);
                }
            })
        );
    }

    /**
     * Execute a block.
     *
     * @param {RpgPlayer} player - The RPG player.
     * @param {string} blockId - The block ID to execute.
     *
     * @return {Observable<BlockExecuteReturn>} The block execution result as an Observable.
     */
    private executeBlock(player: RpgPlayer, blockId: string): Observable<BlockExecuteReturn> {
        const dataBlock = this.dataBlocks[blockId]
        const block = this.getBlock(dataBlock.id)

        // add block execution to history
        this.executionHistory.push({ blockId, data: dataBlock });

        if (block) {
            const ret = block.execute(player, dataBlock)
            if (typeof ret == 'string' || ret === undefined) {
                return of(ret)
            }
            else {
                // Add timeout to the execution
                return from(ret).pipe(
                    timeout(this.executionTimeout)
                );
            }
        } else {
            return of(undefined);
        }
    }
}