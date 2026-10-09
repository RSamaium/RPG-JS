import type { ExecutionPlayer } from './types';

const TEMPLATE_PATTERN = /\{\{\s*variable\s*:\s*([^|{}]+?)(?:\s*\|\s*label\s*:\s*([^{}]*?))?\s*\}\}/g;
const LEGACY_PATTERN = /\{(hp|level)\}/g;
const BLOCKED_PATH_SEGMENTS = new Set(['__proto__', 'prototype', 'constructor']);

/**
 * JSON Schema format metadata used by Studio string-template fields.
 *
 * @title Studio string template format
 * @prop
 * @memberof StudioRuntime
 * @example
 * ```ts
 * const schema = { type: 'string', format: studioStringTemplateFormat };
 * ```
 */
export const studioStringTemplateFormat = {
  helper: 'string-template',
} as const;

/**
 * JSON Schema format metadata for Studio textarea template fields.
 *
 * @title Studio textarea string template format
 * @prop
 * @memberof StudioRuntime
 * @example
 * ```ts
 * const schema = { type: 'string', format: studioTextareaTemplateFormat };
 * ```
 */
export const studioTextareaTemplateFormat = {
  name: 'textarea',
  ...studioStringTemplateFormat,
} as const;

/** A parsed `variable` token in a Studio string template. */
export interface StudioStringTemplateToken {
  type: 'variable';
  /** Complete token as stored in the template. */
  raw: string;
  /** Runtime path, such as `player.hp` or `variable.customer.firstName`. */
  path: string;
  /** Human-readable label used only by the Studio editor. */
  label?: string;
  /** Inclusive character offset in the source string. */
  start: number;
  /** Exclusive character offset in the source string. */
  end: number;
}

/** Minimal runtime context required to resolve a Studio string template. */
export interface StudioStringTemplateContext {
  player: ExecutionPlayer | object;
  getVariable?(variableId: string): unknown;
}

/**
 * Parse Studio variable tokens without resolving their values.
 *
 * The parser is shared by the Studio editor and runtime. Labels are editor-only
 * metadata and do not affect the resolved game text.
 *
 * @title Parse a Studio string template
 * @method parseStringTemplate
 * @param text - Template containing `{{ variable:path | label:Label }}` tokens.
 * @returns Parsed tokens with their source offsets.
 * @memberof StudioRuntime
 * @example
 * ```ts
 * parseStringTemplate('HP: {{ variable:player.hp | label:Health }}');
 * ```
 */
export function parseStringTemplate(text: string): StudioStringTemplateToken[] {
  return Array.from(text.matchAll(TEMPLATE_PATTERN), (match) => {
    const raw = match[0];
    const label = match[2]?.trim();
    const start = match.index ?? 0;
    return {
      type: 'variable' as const,
      raw,
      path: match[1].trim(),
      label: label || undefined,
      start,
      end: start + raw.length,
    };
  });
}

function readPath(source: unknown, segments: string[]): unknown {
  let current = source;
  for (const segment of segments) {
    if (!segment || BLOCKED_PATH_SEGMENTS.has(segment)) return undefined;
    if ((typeof current !== 'object' && typeof current !== 'function') || current === null) {
      return undefined;
    }
    current = Reflect.get(current, segment);
  }
  return current;
}

function getVariable(context: StudioStringTemplateContext, variableId: string): unknown {
  if (typeof context.getVariable === 'function') {
    return context.getVariable(variableId);
  }
  const playerGetVariable = Reflect.get(context.player, 'getVariable');
  if (typeof playerGetVariable === 'function') {
    return playerGetVariable.call(context.player, variableId);
  }
  return undefined;
}

function resolvePath(path: string, context: StudioStringTemplateContext): unknown {
  const segments = path.split('.');
  if (segments.some((segment) => !segment || segment.trim() !== segment || BLOCKED_PATH_SEGMENTS.has(segment))) {
    return undefined;
  }

  const [namespace, identifier, ...nestedPath] = segments;
  if (!identifier) return undefined;

  if (namespace === 'player') {
    return readPath(context.player, segments.slice(1));
  }
  if (namespace === 'variable') {
    return readPath(getVariable(context, identifier), nestedPath);
  }
  return undefined;
}

function stringifyResolvedValue(value: unknown): string | undefined {
  if (value === null || value === undefined) return undefined;
  if (typeof value === 'object' || typeof value === 'function') return undefined;
  return String(value);
}

/**
 * Resolve player properties and stored variables in a Studio string template.
 *
 * Unknown paths, null values, objects, and forbidden prototype paths remain
 * unchanged so configuration errors stay visible. This runs on the same side as
 * the Studio block executor and works in standalone and MMORPG modes.
 *
 * @title Resolve a Studio string template
 * @method resolveStringTemplate
 * @param text - Template to resolve.
 * @param context - Current player and optional variable accessor.
 * @returns Template with every resolvable token replaced by its primitive value.
 * @memberof StudioRuntime
 * @example
 * ```ts
 * resolveStringTemplate(
 *   'HP: {{ variable:player.hp | label:Health }}',
 *   { player }
 * );
 * ```
 */
export function resolveStringTemplate(
  text: string,
  context: StudioStringTemplateContext,
): string {
  const tokens = parseStringTemplate(text);
  let cursor = 0;
  let output = '';

  for (const token of tokens) {
    output += text.slice(cursor, token.start);
    output += stringifyResolvedValue(resolvePath(token.path, context)) ?? token.raw;
    cursor = token.end;
  }
  output += text.slice(cursor);

  return output.replace(LEGACY_PATTERN, (match, property: string) => {
    return stringifyResolvedValue(readPath(context.player, [property])) ?? match;
  });
}

/**
 * Legacy alias for the previous Studio text resolver.
 *
 * @deprecated Use {@link resolveStringTemplate} with an execution context.
 */
export const resolveVariablesInText = (text: string, player: ExecutionPlayer): string => {
  return resolveStringTemplate(text, { player });
};
