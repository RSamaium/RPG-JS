import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import { jsonSchemaToZod } from '../src/validate'
import { z } from 'zod'

describe('jsonSchemaToZod', () => {

    test('Should convert basic types correctly', async () => {
        const schema = {
            type: 'object',
            properties: {
                name: { type: 'string' },
                email: { type: 'email' },
                age: { type: 'integer' },
                isActive: { type: 'boolean' },
                scores: { type: 'array', items: { type: 'number' } },
            },
            required: ['name', 'email']
        }

        const zodSchema = jsonSchemaToZod(schema)

        expect(Object.keys(zodSchema)).toEqual(['name', 'email', 'age', 'isActive', 'scores'])
    })

    test('Should throw an error for unsupported types', async () => {
        const schema = {
            type: 'object',
            properties: {
                unsupportedProp: { type: 'unsupported' }
            }
        }

        expect(() => jsonSchemaToZod(schema)).toThrow('Unsupported type: unsupported')
    })

    test('Should apply validators correctly', async () => {
        const schema = {
            type: 'object',
            properties: {
                name: { type: 'string', minLength: 3, maxLength: 50 },
                age: { type: 'integer', minimum: 18, maximum: 100 },
            },
            required: ['name']
        }

        const zodSchema = z.object(jsonSchemaToZod(schema))

        // Name is required
        let result = zodSchema.safeParse({ age: 30 })
        expect(result.success).toBeFalsy()

        // Name is too short
        result = zodSchema.safeParse({ name: 'Jo', age: 30 })
        expect(result.success).toBeFalsy()

        // Name is too long
        result = zodSchema.safeParse({ name: 'J'.repeat(51), age: 30 })
        expect(result.success).toBeFalsy()

        // Age is too low
        result = zodSchema.safeParse({ name: 'John', age: 17 })
        expect(result.success).toBeFalsy()

        // Age is too high
        result = zodSchema.safeParse({ name: 'John', age: 101 })
        expect(result.success).toBeFalsy()

        // All validations pass
        result = zodSchema.safeParse({ name: 'John', age: 30 })
        expect(result.success).toBeTruthy()
    })

    test('Should handle string type correctly', async () => {
        const schema = {
            type: 'object',
            properties: {
                name: { type: 'string' },
            },
        }

        const zodSchema = z.object(jsonSchemaToZod(schema))

        // Name is not a string
        let result = zodSchema.safeParse({ name: 123 })
        expect(result.success).toBeFalsy()

        // Name is a string
        result = zodSchema.safeParse({ name: 'John' })
        expect(result.success).toBeTruthy()
    })

})