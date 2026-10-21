/**
 * What a listener can ask before it runs: a filter on the payload of the signal (`where`) and conditions on the player (`when`).
 * Both are plain data, so they can be read before anything runs: who listens to what is known without launching a script.
 * Pure TypeScript with no import: it runs anywhere the interpreter does.
 */

export type PayloadType = "string" | "number" | "boolean" | "string[]" | "number[]" | "object";

/** A field of the payload of a signal. An `object` lists its `fields`. */
export interface PayloadField { type: PayloadType; doc?: string; fields?: Record<string, PayloadField> }

/** A signal the game emits: what it is, and what its payload holds. */
export interface SignalDesc { doc?: string; payload: Record<string, PayloadField> }

export type Comparison = { eq?: unknown; ne?: unknown; gt?: number; gte?: number; lt?: number; lte?: number };
/** `{ "skill.tags": { has: "fire" }, power: { gte: 5 }, map: "town" }`: a value alone means equal. */
export type WhereMatcher = string | number | boolean | null | (Comparison & { in?: unknown[]; has?: unknown; exists?: boolean });
export type Condition =
  | ({ switch: string; is?: boolean })
  | ({ variable: string } & Comparison)
  | ({ item: string } & Comparison)
  | ({ stat: "gold" | "level" } & Comparison);

export interface ListenFilter { where?: Record<string, WhereMatcher>; when?: Condition[] }

/** What a condition reads of the player. */
export interface ConditionPlayer { gold: number; level: number; itemCount(id: string): number; getVariable(id: string): unknown }

const COMPARATORS = ["eq", "ne", "gt", "gte", "lt", "lte"] as const;
const MATCH_OPERATORS = [...COMPARATORS, "in", "has", "exists"] as const;
const NUMERIC = new Set(["gt", "gte", "lt", "lte"]);
const SUBJECTS = ["switch", "variable", "item", "stat"] as const;
const UNSAFE = new Set(["__proto__", "constructor", "prototype"]);
const PATH = /^[A-Za-z_][A-Za-z0-9_]*(\.[A-Za-z_][A-Za-z0-9_]*)*$/;

const isPlain = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);

/** The value at a dotted path of the payload, from its own properties only. */
export function readPath(payload: unknown, path: string): unknown {
  let cur: unknown = payload;
  for (const key of path.split(".")) {
    if (UNSAFE.has(key) || !isPlain(cur) || !Object.prototype.hasOwnProperty.call(cur, key)) return undefined;
    cur = cur[key];
  }
  return cur;
}

const compare = (value: unknown, op: string, want: unknown): boolean => {
  switch (op) {
    case "eq": return value === want;
    case "ne": return value !== want;
    case "gt": return typeof value === "number" && value > (want as number);
    case "gte": return typeof value === "number" && value >= (want as number);
    case "lt": return typeof value === "number" && value < (want as number);
    case "lte": return typeof value === "number" && value <= (want as number);
    default: return false;
  }
};

/** The first entry of `where` that does not hold, as text (`skill.tags has "ice"`), or undefined when they all hold. */
export function whereFailure(payload: unknown, where: Record<string, WhereMatcher> | undefined): string | undefined {
  for (const [path, matcher] of Object.entries(where ?? {})) {
    const value = readPath(payload, path);
    const ops: Record<string, unknown> = isPlain(matcher) ? matcher : { eq: matcher };
    for (const [op, want] of Object.entries(ops)) {
      const ok =
        op === "in" ? Array.isArray(want) && want.includes(value)
        : op === "has" ? Array.isArray(value) && value.includes(want)
        : op === "exists" ? (value !== undefined) === want
        : compare(value, op, want);
      if (!ok) return `${path} ${op === "eq" ? "is" : op} ${JSON.stringify(want)}`;
    }
  }
  return undefined;
}

export const matchesWhere = (payload: unknown, where: Record<string, WhereMatcher> | undefined): boolean => whereFailure(payload, where) === undefined;

/** The first condition that does not hold, as text (`stat gold gte 500`), or undefined when they all hold. */
export function conditionFailure(conditions: Condition[] | undefined, player: ConditionPlayer): string | undefined {
  for (const c of conditions ?? []) {
    if ("switch" in c) {
      const v = player.getVariable(c.switch);
      const on = v === true || v === 1;
      if (on !== (c.is ?? true)) return `switch ${c.switch} is not ${c.is ?? true}`;
      continue;
    }
    const subject = "variable" in c ? "variable" : "item" in c ? "item" : "stat";
    const name = (c as any)[subject] as string;
    const value =
      subject === "variable" ? (typeof player.getVariable(name) === "number" ? (player.getVariable(name) as number) : 0)
      : subject === "item" ? player.itemCount(name)
      : name === "gold" ? player.gold : player.level;
    const ops = COMPARATORS.filter((op) => (c as any)[op] !== undefined);
    if (!ops.length) ops.push("gte"); // an item with no comparison: the player has it
    for (const op of ops) {
      const want = (c as any)[op] ?? 1;
      if (!compare(value, op, want)) return `${subject} ${name} ${op} ${JSON.stringify(want)}`;
    }
  }
  return undefined;
}

export const evaluateConditions = (conditions: Condition[] | undefined, player: ConditionPlayer): boolean => conditionFailure(conditions, player) === undefined;

function fieldAt(payload: Record<string, PayloadField>, path: string): PayloadField | undefined {
  let fields: Record<string, PayloadField> | undefined = payload;
  let field: PayloadField | undefined;
  for (const key of path.split(".")) {
    field = fields?.[key];
    if (!field) return undefined;
    fields = field.type === "object" ? field.fields : undefined;
  }
  return field;
}

/** What is wrong with a filter written in a script, as text, or undefined when it is valid. Knowing the signal checks the paths. */
export function validateFilter(filter: unknown, signal?: SignalDesc & { name: string }): string | undefined {
  if (!isPlain(filter)) return "a filter is { where, when }";
  for (const key of Object.keys(filter)) if (key !== "where" && key !== "when") return `a filter is { where, when }, not "${key}"`;

  if (filter.where !== undefined) {
    if (!isPlain(filter.where)) return '"where" is { "path": value-or-operators }';
    for (const [path, matcher] of Object.entries(filter.where)) {
      if (!PATH.test(path) || path.split(".").some((k) => UNSAFE.has(k))) return `"${path}" is not a valid path`;
      let ops: string[] = ["eq"];
      if (isPlain(matcher)) {
        ops = Object.keys(matcher);
        for (const op of ops) {
          if (!(MATCH_OPERATORS as readonly string[]).includes(op)) return `unknown operator "${op}" for "${path}" (${MATCH_OPERATORS.join(", ")})`;
          const want = matcher[op];
          if (NUMERIC.has(op) && typeof want !== "number") return `"${op}" of "${path}" needs a number`;
          if (op === "in" && !Array.isArray(want)) return `"in" of "${path}" needs a list`;
          if (op === "exists" && typeof want !== "boolean") return `"exists" of "${path}" needs true or false`;
        }
      } else if (matcher !== null && !["string", "number", "boolean"].includes(typeof matcher)) {
        return `"${path}" is compared to a text, a number, true/false or null (use { in: [...] } for several values)`;
      }
      if (signal) {
        const field = fieldAt(signal.payload, path);
        if (!field) return `"${path}" is not in the payload of "${signal.name}". It has: ${Object.keys(signal.payload).join(", ")}`;
        for (const op of ops) {
          if (op === "has" && !field.type.endsWith("[]")) return `"has" needs a list, "${path}" is ${field.type}`;
          if (NUMERIC.has(op) && field.type !== "number") return `"${op}" needs a number, "${path}" is ${field.type}`;
        }
      }
    }
  }

  if (filter.when !== undefined) {
    if (!Array.isArray(filter.when)) return '"when" is a list of conditions';
    for (const c of filter.when) {
      if (!isPlain(c)) return "a condition is an object";
      const subjects = SUBJECTS.filter((s) => s in c);
      if (subjects.length !== 1) return `a condition starts with one of: ${SUBJECTS.join(", ")}`;
      const subject = subjects[0];
      const allowed = subject === "switch" ? ["switch", "is"] : [subject, ...COMPARATORS];
      for (const key of Object.keys(c)) if (!allowed.includes(key)) return `"${key}" is not part of a ${subject} condition (${allowed.join(", ")})`;
      if (typeof c[subject] !== "string") return `the ${subject} of a condition is a name`;
      if (subject === "switch" && c.is !== undefined && typeof c.is !== "boolean") return '"is" needs true or false';
      if (subject === "stat" && c.stat !== "gold" && c.stat !== "level") return 'a stat is "gold" or "level"';
      if (subject === "variable" && !COMPARATORS.some((op) => op in c)) return `a variable condition needs a comparison (${COMPARATORS.join(", ")})`;
      if (subject === "stat" && !COMPARATORS.some((op) => op in c)) return `a stat condition needs a comparison (${COMPARATORS.join(", ")})`;
      for (const op of COMPARATORS) if (NUMERIC.has(op) && op in c && typeof c[op] !== "number") return `"${op}" of a ${subject} condition needs a number`;
    }
  }
  return undefined;
}
