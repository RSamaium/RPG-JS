import { Observable, catchError, of, switchMap } from "rxjs"
import { Block } from "./types/block"
import { Edge } from "./types/edge"
import { formatMessage } from "./format-message"
import blocks, { Flow } from "./blocks"
import type { RpgPlayer } from "@rpgjs/server"
import { jsonSchemaToZod } from './validate';
import { z, ZodError } from 'zod';

export class RpgInterpreter {
    private blocksById: { [key: string]: Block } = {}

    constructor(
        private dataBlocks: Flow,
        private edges: Edge,
        _formatMessage = formatMessage
    ) {
        blocks.forEach(block => {
            const _blocks = block(_formatMessage)
            this.blocksById[_blocks.id] = _blocks
        })
    }

    private getBlock(id: string): Block {
        return this.blocksById[id]
    }

    start({ player, blockId }: { player: RpgPlayer, blockId: string }) {
        if (this.validateFlow(blockId)) {
            return this.executeFlow(player, blockId);
        } else {
            throw new Error("Invalid flow");
        }
    }

    validateBlock(blockId: string): ZodError | null {
        const dataBlock = this.dataBlocks[blockId];
        const block = this.getBlock(dataBlock.id);

        if (!block) {
            throw new Error(`Block with id ${blockId} does not exist.`);
        }

        const schemaZod = z.object(jsonSchemaToZod(block.schema));

        const parse = schemaZod.safeParse(dataBlock);

        if (!parse.success) {
            return parse.error;
        }

        return null
    }

    validateFlow(blockId: string, diagnotics = {}): { [blockId: string]: ZodError } | null {
        const recursiveValidate = (blockId, diagnotics) => {
            // Validate the initial block
            const validate = this.validateBlock(blockId)

            if (validate !== null) {
                diagnotics[blockId] = validate;
            }

            // Get the next block(s) in the flow
            const nextBlockIds = this.edges[blockId];

            // If there are no more blocks in the flow, return true
            if (!nextBlockIds) {
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

    private executeFlow(player: RpgPlayer, blockId: string): Observable<any> {
        // This function recursively executes the flow starting from the given blockId
        return this.executeBlock(player, blockId, this.dataBlocks[blockId]).pipe(
            catchError(error => {
                console.error(`Failed to execute block ${blockId}:`, error);
                return of(null); // Continue the flow even if one block fails
            }),
            switchMap(() => {
                const nextBlockId = this.edges[blockId];
                if (nextBlockId) {
                    if (Array.isArray(nextBlockId)) {
                        // If there are multiple next blocks, execute them all
                        return nextBlockId.map(id => this.executeFlow(player, id));
                    } else {
                        // If there is one next block, execute it
                        return this.executeFlow(player, nextBlockId);
                    }
                } else {
                    // If there are no more blocks, return an observable that completes immediately
                    return of(null);
                }
            })
        );
    }

    private executeBlock(player: RpgPlayer, blockId: string, dataBlock: any): Observable<any> {
        const block = this.getBlock(blockId);
        if (block) {
            return block.execute(player, dataBlock);
        } else {
            return of(null); // If the block doesn't exist, return an observable that completes immediately
        }
    }
}