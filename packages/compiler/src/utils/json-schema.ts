import Ajv from "ajv";
import addFormats from "ajv-formats";

interface ServerSchema {
  type: 'object';
  properties: Record<string, unknown>;
  required: string[];
}

interface ClientSchema {
  type: 'object';
  properties: Record<string, unknown>;
}

interface JsonSchema {
  namespace?: string;
  server?: ServerSchema;
  client?: ClientSchema;
  '*': ServerSchema | ClientSchema;
}

interface InputData {
  [key: string]: unknown;
}

interface ParsedData {
  server: Record<string, unknown>;
  client: Record<string, unknown>;
  namespace: string;
  extraProps: string[];
}

function parseNamespace(inputData: InputData, properties: Record<string, unknown>) {
  const data: Record<string, unknown> = {};
  for (const [key] of Object.entries(properties || {})) {
    data[key] = inputData[key];
  }
  return data;
}

export function parseJsonSchema(jsonSchema: JsonSchema, inputData: InputData): ParsedData {
  let server: any = {};
  let client: any = {};

  const namespace = jsonSchema.namespace || '';
  const getObjectByNamespace = (): any => {
    return namespace ? (inputData[namespace] || {}) : inputData
  }

  function toPathAsObject(instancePath) {
    return instancePath.replace(/^\//, '').replace(/\//g, '.')
  }

  const validate = (jsonSchema, side: string) => {
    const ajv = new Ajv({ allErrors: true, allowUnionTypes: true });
    addFormats(ajv);
    const ajvValidate = ajv.compile(jsonSchema);
    const valid = ajvValidate(getObjectByNamespace());
    if (!valid) {
      const errors = ajvValidate.errors;
      if (!errors) {
        throw new Error('Unknown error')
      }
      const firstError = errors[0];
      const error: any = new Error(firstError.message);
      error.namespace = namespace;
      error.params = firstError.params;
      error.property = firstError.params.missingProperty ?? toPathAsObject(firstError.instancePath)
      throw error
    }
  }

  if (jsonSchema.server && Object.keys(jsonSchema.server).length > 0) {
    try {
      validate(jsonSchema.server, 'server');
    }
    catch (e) {
      throw e
    }
    const object = parseNamespace(getObjectByNamespace(), jsonSchema.server.properties);
    if (namespace) {
      server[namespace] = object
    }
    else {
      server = object
    }
  }

  if (jsonSchema.client && Object.keys(jsonSchema.client).length > 0) {
    try {
      validate(jsonSchema.client, 'client');
    }
    catch (e) {
      throw e
    }
    const object = parseNamespace(getObjectByNamespace(), jsonSchema.client.properties);
    if (namespace) {
      client[namespace] = object
    }
    else {
      client = object
    }
  }

  if (jsonSchema['*'] && Object.keys(jsonSchema['*']).length > 0) {
    const commonData = parseNamespace(getObjectByNamespace(), jsonSchema['*'].properties);
    try {
      validate(jsonSchema['*'], 'both');
    }
    catch (e) {
      throw e
    }
    if (namespace) {
      server[namespace] = { ...server[namespace], ...commonData };
      client[namespace] = { ...client[namespace], ...commonData };
    }
    else {
      server = { ...server, ...commonData };
      client = { ...client, ...commonData };
    }
  }

  function addAdditionalProperties(schema: any): JsonSchema {
    if (schema.type === "object") {
      if (!("additionalProperties" in schema)) {
        schema.additionalProperties = false;
      }
  
      if (schema.properties) {
        for (const key in schema.properties) {
          schema.properties[key] = addAdditionalProperties(schema.properties[key]);
        }
      }
    }
  
    return schema;
  }

  function check(jsonSchema: any, obj: object): string[] {
    const ajv = new Ajv({ allErrors: true, allowUnionTypes: true });
    addFormats(ajv);
    const validate = ajv.compile(addAdditionalProperties(jsonSchema));
    const valid = validate(obj);

    if (!valid) {
      const extraProps: string[] = [];
      validate.errors?.forEach((error) => {
        if (error.keyword === "additionalProperties") {
          const root = toPathAsObject(error.instancePath)
          const propPath = root + (root ? '.' : '') + error.params?.additionalProperty;
          extraProps.push(propPath);
        }
      });
      return extraProps;
    } else {
      return [];
    }
  }

  const allProperties =  {
    ...(jsonSchema.server?.properties || {}),
    ...(jsonSchema.client?.properties || {}),
    ...(jsonSchema['*']?.properties || {}),
  };

  const extraProps = 
    check({ type: 'object', properties: allProperties }, getObjectByNamespace())
    .filter((prop) => prop !== 'modules')
    .map(prop => namespace ? `${namespace}.${prop}` : prop)

  return { server, client, namespace, extraProps };
}
