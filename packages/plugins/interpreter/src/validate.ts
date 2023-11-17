import { z, ZodType } from "zod";

const percent = z.number().min(0).max(100)

const typeMap: Record<string, (property?: any, key?: string) => z.ZodType<any, any>> = {
    'code': () => z.string(),
    'color': () => z.string().regex(/^#(?:[0-9a-fA-F]{3}){1,2}$/, 'Invalid color format'),
    'date': () => z.date(),
    'password': () => z.string(),
    'email': () => z.string().email(),
    'text': () => z.string(),
    'string': () => z.string(),
    'integer': () => z.number(),
    'percent': () => percent,
    'number': () => z.number(),
    'boolean': () => z.boolean(),
    'array': (property: any, key?: string) => {
        const ret = jsonSchemaToZod(property.items)
        if (ret.type === 'object') {
            return z.array(ret)
        }
        return z.array(ret[key as string])
    },
    'object': (property: any) => jsonSchemaToZod(property),
};

function applyValidators(zodType: ZodType<any, any>, property: any, required: boolean): ZodType<any, any> {
    let zodTypeWithValidators = zodType;

    if (property.type === 'string' && required) {
        zodTypeWithValidators = (zodTypeWithValidators as z.ZodString).min(1);

        if (property.minLength !== undefined) {
            zodTypeWithValidators = (zodTypeWithValidators as z.ZodString).min(property.minLength);
        }

        if (property.maxLength !== undefined) {
            zodTypeWithValidators = (zodTypeWithValidators as z.ZodString).max(property.maxLength);
        }
    }

    if (property.type === 'array') {
        if (property.minItems !== undefined) {
            zodTypeWithValidators = (zodTypeWithValidators as z.ZodArray<any>).min(property.minItems);
        }
        if (property.maxItems !== undefined) {
            zodTypeWithValidators = (zodTypeWithValidators as z.ZodArray<any>).max(property.maxItems);
        }
    }

    if (property.type === 'number' || property.type === 'integer') {
        if (property.minimum !== undefined) {
            zodTypeWithValidators = (zodTypeWithValidators as z.ZodNumber).min(property.minimum);
        }

        if (property.maximum !== undefined) {
            zodTypeWithValidators = (zodTypeWithValidators as z.ZodNumber).max(property.maximum);
        }
    }

    if (property.enum) {
        zodTypeWithValidators = zodTypeWithValidators.refine(value => property.enum.includes(value), {
            message: `Must be one of: ${property.enum.join(", ")}`,
        });
    }

    if (property.pattern) {
        zodTypeWithValidators = (zodTypeWithValidators as z.ZodString).regex(new RegExp(property.pattern));
    }
    // Add additional validations here based on other schema properties
    //...

    return zodTypeWithValidators;
}

export function jsonSchemaToZod(schema: any, propKey?): any {
    let zodSchema: Record<string, z.ZodType<any, any>> = {};

    const appendZodSchema = (prop, key) => {
        if (prop.$ref) {
            zodSchema[key] = z.array(
                z.object({
                    value: z.object({
                        id: z.string()
                    })
                })
            )
            return
        }

        if (prop.type === 'object') {
            zodSchema[key] = z.object(jsonSchemaToZod(prop, key))
            return
        }

        let typeFunc = typeMap[prop.type];

        if (!typeFunc) {
            throw new Error(`Unsupported type: ${prop.type}`);
        }

        let required = schema.required && schema.required.includes(key);
        let typeValidator = applyValidators(typeFunc(prop, propKey), prop, required);

        if (required) {
            zodSchema[key] = typeValidator
        } else {
            zodSchema[key] = typeValidator.optional();
        }
    }

    if (Array.isArray(schema)) {
        for (let i = 0; i < schema.length; i++) {
            zodSchema = {
                ...zodSchema,
                ...jsonSchemaToZod(schema[i].schema)
            } as any
        }
    } else {
        if (schema.type === 'object') {
            for (let key in schema.properties) {
                const prop = schema.properties[key]
                appendZodSchema(prop, key)
            }
        }
        else {
            appendZodSchema(schema, propKey)
        }
    }
    return zodSchema;
}