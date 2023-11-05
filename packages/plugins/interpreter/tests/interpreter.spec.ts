import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { RpgInterpreter } from '../src/interpreter'
import { lastValueFrom } from 'rxjs'

const blocks = {
    block1: {
        id: 'text',
        text: 'Hello World'
    },
    block2: {
        id: 'choice',
        text: 'Please ?',
        choices: ['I want to play', 'I want to quit']
    },
    block3: {
        id: 'text',
        text: 'Thanks'
    },
    block4: {
        id: 'text',
        text: 'Ok...'
    }
}

const edges = {
    'block1': 'block2',
    'block2': {
        blocks: [{
            blockId: 'block3',
            handle: 'choices.0'
        },
        {
            blockId: 'block4',
            handle: 'choices.1'
        }]
    }
}

describe('Interpreter', () => {
    test('validateBlock has not error', () => {
        const interpreter = new RpgInterpreter(blocks, edges);
        const val = interpreter.validateBlock('block1')
        expect(val).toBeNull()
    })

    test('validateBlock has error', () => {
        const interpreter = new RpgInterpreter({
            block1: {
                id: 'text',
            }
        } as any, edges);
        const val = interpreter.validateBlock('block1')
        expect(val).not.toBeNull()
        expect(val?.errors[0].path).toEqual(['text'])
        expect(val?.errors[0].message).toEqual('Required')
        expect(val?.errors[0].code).toEqual('invalid_type')
    })

    test('validateFlow has not error', () => {
        const interpreter = new RpgInterpreter(blocks, edges)
        const val = interpreter.validateFlow('block1')
        expect(val).toBeNull()
    })

    test('validateFlow has an not error', () => {
        const interpreter = new RpgInterpreter(blocks, edges)
        const val = interpreter.validateFlow('block1')
        expect(val).toBeNull()
    })

    test('validateFlow has an error', () => {
        const interpreter = new RpgInterpreter({
            block1: {
                id: 'text',
                text: 'Hello World'
            }
        }, edges)
        const val = interpreter.validateFlow('block1')
        expect(val).not.toBeNull()
        expect(val).toHaveProperty('block2')
        expect(val?.['block2'].errors[0].message).toEqual('block2 id does not exist.')
    })

    test('validateFlow has an error', () => {
        const interpreter = new RpgInterpreter({
            block1: {
                id: 'text',
                text: 'Hello World'
            },
            block2: {
                id: 'text',
            }
        } as any, {
            'block1': 'block2'
        })
        const val = interpreter.validateFlow('block1')
        expect(val).not.toBeNull()
        expect(val).toHaveProperty('block2')
        expect(val?.['block2'].errors[0].message).toEqual('Required')
    })

    describe('executeFlow', () => {
        let player

        beforeEach(() => {
            player = {
                showText: vi.fn().mockResolvedValue(undefined),
                showChoices: vi.fn().mockResolvedValue({ text: 'test', value: 0 }),
                gold: 0
            }
        })

        test('Simple Flow', async () => {
            const interpreter = new RpgInterpreter({
                block1: {
                    id: 'text',
                    text: 'Hello World 1'
                },
                block2: {
                    id: 'text',
                    text: 'Hello World 2'
                }
            } as any, {
                'block1': 'block2'
            })

            await lastValueFrom(interpreter.start({
                player,
                blockId: 'block1'
            }))

            expect(player.showText).toHaveBeenCalledTimes(2)
            expect(player.showText).toHaveBeenNthCalledWith(1, 'Hello World 1')
            expect(player.showText).toHaveBeenNthCalledWith(2, 'Hello World 2')
        })

        test('Flow with mutli edge', async () => {
            const interpreter = new RpgInterpreter(blocks, edges)

            await lastValueFrom(interpreter.start({
                player,
                blockId: 'block1'
            }))

            expect(player.showChoices).toHaveBeenCalledTimes(1)
            expect(player.showText).toHaveBeenCalledTimes(2)
        })

        test('Recursion limit', async () => {
            const interpreter = new RpgInterpreter({
                block1: {
                    id: 'text',
                    text: 'Hello World'
                },
            } as any, {
                'block1': 'block1'
            }, {
                recursionLimit: 1
            })

            await expect(lastValueFrom(interpreter.start({
                player,
                blockId: 'block1'
            }))).rejects.toThrow('Recursion limit exceeded');
        })

        test('Deep recursion', async () => {
            const deepFlow = Array(1002).fill(null).reduce((acc, _, index) => {
                acc['block' + index] = {
                    id: 'text',
                    text: 'Hello World'
                };
                return acc;
            }, {});

            const deepEdges = Array(1001).fill(null).reduce((acc, _, index) => {
                acc['block' + index] = 'block' + (index + 1);
                return acc;
            }, {});

            const interpreter = new RpgInterpreter(deepFlow, deepEdges);

            await expect(lastValueFrom(interpreter.start({
                player,
                blockId: 'block0'
            }))).rejects.toThrow('Recursion limit exceeded');
        })

        test('Execution timeout', async () => {
            player = {
                showText: vi.fn().mockImplementation(() => new Promise(resolve => setTimeout(resolve, 1500))),
            }

            const interpreter = new RpgInterpreter({
                block1: {
                    id: 'text',
                    text: 'Hello World'
                },
            } as any, {
                'block1': 'block1'
            }, {
                executionTimeout: 1000
            })

            await expect(lastValueFrom(interpreter.start({
                player,
                blockId: 'block1'
            }))).rejects.toThrow('Timeout has occurred');
        })

        describe('With Parameters', () => {
            const fnSchema = (formatMessage) => {
                return {
                    type: 'object',
                    properties: {
                        gold: {
                            type: 'number',
                            title: formatMessage({
                                defaultMessage: 'Value',
                                description: 'Set Value',
                            }),
                        }
                    },
                    required: ['gold']
                }
            }

            test('Flow with Parameters, Wrong Param', async () => {
                const interpreter = new RpgInterpreter({
                    block1: {
                        id: 'text',
                        text: 'Hello World 1'
                    }
                }, {}, {
                    parametersSchema: fnSchema
                })

                await expect(lastValueFrom(interpreter.start({
                    player,
                    blockId: 'block1'
                }))).rejects.toThrow(
                    expect.objectContaining({
                        errors: expect.arrayContaining([
                            expect.objectContaining({
                                code: 'invalid_type'
                            })
                        ])
                    })
                )
            })

            test('Flow with Parameters, True Param', async () => {
                const interpreter = new RpgInterpreter({
                    block1: {
                        id: 'gold',
                        value: 10
                    }
                }, {}, {
                    parametersSchema: fnSchema
                })

                await lastValueFrom(interpreter.start({
                    player,
                    blockId: 'block1',
                    parameters: {
                        gold: 100
                    }
                }))

                expect(player.gold).toEqual(10)
            })
        })

        afterEach(() => {
            vi.restoreAllMocks()
        })
    })
})