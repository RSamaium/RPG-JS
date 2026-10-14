/**
 * Fills the missing (or `null`) top-level fields of a block with the `default` declared in its schema.
 *
 * A block that was just added and never opened in the form has no data yet, so a field such as
 * `wait.duration` (default `1`) would otherwise be reported as missing, or reach the executor as `undefined`.
 *
 * @param schema - The JSON schema of the block data
 * @param data - The data stored on the block
 * @returns The data, completed with the schema defaults (the same object when nothing is missing)
 *
 * @example
 * ```ts
 * applyBlockSchemaDefaults(schemaWait.schema, {}) // { duration: 1 }
 * ```
 */
export function applyBlockSchemaDefaults<T extends Record<string, unknown>>(schema: unknown, data: T | undefined): T {
  const current = (data ?? {}) as Record<string, unknown>;
  const properties = (schema as { properties?: Record<string, { default?: unknown }> } | null)?.properties;
  if (!properties) return current as T;

  let completed: Record<string, unknown> | undefined;
  for (const [key, property] of Object.entries(properties)) {
    if (property?.default === undefined) continue;
    if (current[key] !== undefined && current[key] !== null) continue;
    completed ??= { ...current };
    completed[key] = property.default;
  }
  return (completed ?? current) as T;
}
