export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | readonly JsonValue[] | { readonly [key: string]: JsonValue };
export type JsonObject = { readonly [key: string]: JsonValue };

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

/** True when `value` survives `JSON.stringify` / `JSON.parse` unchanged. */
export function isJsonValue(value: unknown): value is JsonValue {
  if (value === null) return true;
  switch (typeof value) {
    case "string":
    case "boolean":
      return true;
    case "number":
      return Number.isFinite(value);
    case "object":
      if (Array.isArray(value)) return value.every(isJsonValue);
      // A property set to `undefined` is dropped by `JSON.stringify`, so it counts as absent.
      return isPlainObject(value) && Object.values(value).every((item) => item === undefined || isJsonValue(item));
    default:
      return false;
  }
}

export function isJsonObject(value: unknown): value is JsonObject {
  return isPlainObject(value) && isJsonValue(value);
}

/** Deep copy of a JSON value, so that callers never share structure with the model. */
export function cloneJson<T extends JsonValue>(value: T): T {
  if (Array.isArray(value)) return value.map((item) => cloneJson(item)) as unknown as T;
  if (value !== null && typeof value === "object") {
    // `fromEntries` defines own properties, so a `__proto__` key can never reach the prototype.
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, item]) => item !== undefined)
        .map(([key, item]) => [key, cloneJson(item as JsonValue)]),
    ) as unknown as T;
  }
  return value;
}

export function isFiniteNumberValue(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}
