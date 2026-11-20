/**
 * The types of the signatures of the API, read and checked: a value a script gives is checked against the type its parameter
 * declares (`(id: string, data?: { x: number; y?: number }): void`), so that a method of the API needs no checking code of its own.
 *
 * The types are the TypeScript a signature is written in: `string`, `number`, `boolean`, `null`, `object`, `any`, literals
 * (`"up"`, `3`, `true`), unions (`|`), lists (`T[]`), objects (`{ a: T; b?: U; [key: string]: V }`) and `Record<string, T>`.
 */

/** A type, read from its text. */
export type TypeNode =
  | { kind: "any" }
  | { kind: "primitive"; name: "string" | "number" | "boolean" | "null" | "undefined" | "object" }
  | { kind: "literal"; value: string | number | boolean }
  | { kind: "union"; of: TypeNode[] }
  | { kind: "array"; of: TypeNode }
  | { kind: "object"; fields: Record<string, { type: TypeNode; optional: boolean }>; index?: TypeNode };

/** The most a value a script gives holds: characters of a text, entries of a list, levels of data. */
const MAX_TEXT = 2000, MAX_LIST = 1000, MAX_DEPTH = 6;

/** Splits a text at the top level on a separator: not inside (), [], {}, <> nor quotes. */
function splitTop(text: string, separator: string): string[] {
  const parts: string[] = [];
  let depth = 0, quote = "", start = 0;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quote) { if (ch === "\\") i++; else if (ch === quote) quote = ""; continue; }
    if (ch === '"' || ch === "'" || ch === "`") quote = ch;
    else if ("([{<".includes(ch)) depth++;
    else if (ch === ">" && text[i - 1] === "=") continue;
    else if (")]}>".includes(ch)) depth--;
    else if (depth === 0 && text.startsWith(separator, i)) { parts.push(text.slice(start, i)); start = i + separator.length; }
  }
  parts.push(text.slice(start));
  return parts.map((p) => p.trim()).filter((p) => p.length > 0);
}

/** Where the bracket opened at `open` closes. */
function closes(text: string, open: number): number {
  let depth = 0;
  for (let i = open; i < text.length; i++) {
    if ("([{<".includes(text[i])) depth++;
    else if (")]}>".includes(text[i]) && !(text[i] === ">" && text[i - 1] === "=")) { depth--; if (depth === 0) return i; }
  }
  return -1;
}

/**
 * Reads a type written as TypeScript. What it cannot read (a function type, a generic other than `Record`) is `any`: plain data is
 * still required, nothing more is checked.
 */
export function parseType(text: string): TypeNode {
  const t = text.trim();
  const union = splitTop(t, "|");
  if (union.length > 1) return { kind: "union", of: union.map(parseType) };
  if (t.endsWith("[]")) return { kind: "array", of: parseType(t.slice(0, -2)) };
  if (t.startsWith("(") && closes(t, 0) === t.length - 1) return parseType(t.slice(1, -1));
  if (t.includes("=>")) return { kind: "any" };
  if (t.startsWith("{") && t.endsWith("}")) {
    const fields: Record<string, { type: TypeNode; optional: boolean }> = {};
    let index: TypeNode | undefined;
    for (const member of splitTop(t.slice(1, -1), ";").flatMap((m) => splitTop(m, ","))) {
      const indexMatch = /^\[\s*[A-Za-z_$][\w$]*\s*:\s*string\s*\]\s*:\s*([\s\S]+)$/.exec(member);
      if (indexMatch) { index = parseType(indexMatch[1]); continue; }
      const match = /^([A-Za-z_$][\w$]*|"[^"]*")(\?)?\s*:\s*([\s\S]+)$/.exec(member);
      if (!match) return { kind: "any" };
      fields[match[1].replace(/^"|"$/g, "")] = { type: parseType(match[3]), optional: !!match[2] };
    }
    return { kind: "object", fields, index };
  }
  const record = /^Record<\s*string\s*,\s*([\s\S]+)>$/.exec(t);
  if (record) return { kind: "object", fields: {}, index: parseType(record[1]) };
  if (/^"(?:[^"\\]|\\.)*"$|^'(?:[^'\\]|\\.)*'$/.test(t)) return { kind: "literal", value: t.slice(1, -1) };
  if (/^-?\d+(\.\d+)?$/.test(t)) return { kind: "literal", value: Number(t) };
  if (t === "true" || t === "false") return { kind: "literal", value: t === "true" };
  if (["string", "number", "boolean", "null", "undefined", "object"].includes(t)) return { kind: "primitive", name: t as "string" };
  return { kind: "any" };
}

/** The type as a script author reads it, in an error. */
function describe(type: TypeNode): string {
  switch (type.kind) {
    case "any": return "plain data";
    case "primitive": return type.name === "object" ? "plain data { ... }" : `a ${type.name}`;
    case "literal": return JSON.stringify(type.value);
    case "union": return type.of.map(describe).join(" or ");
    case "array": return `a list of ${describe(type.of)}`;
    case "object": return `{ ${Object.entries(type.fields).map(([k, f]) => `${k}${f.optional ? "?" : ""}`).join(", ")}${type.index ? ", ..." : ""} }`;
  }
}

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype;

/** Plain data, of a limited size: a text, a finite number, true/false, null, a list or an object of plain data. */
function plainData(value: unknown, where: string, depth: number): void {
  if (value === null || typeof value === "boolean") return;
  if (typeof value === "number") { if (!Number.isFinite(value)) throw new Error(`${where} must be a finite number`); return; }
  if (typeof value === "string") { if (value.length > MAX_TEXT) throw new Error(`${where} holds ${MAX_TEXT} characters at most`); return; }
  if (depth > MAX_DEPTH) throw new Error(`${where} holds data of ${MAX_DEPTH} levels at most`);
  if (Array.isArray(value)) {
    if (value.length > MAX_LIST) throw new Error(`${where} holds ${MAX_LIST} entries at most`);
    value.forEach((v, i) => plainData(v, `${where}[${i}]`, depth + 1));
    return;
  }
  if (isPlainObject(value)) { for (const [k, v] of Object.entries(value)) plainData(v, `${where}.${k}`, depth + 1); return; }
  throw new Error(`${where} must be plain data (a text, a number, true/false, null, a list or { ... })`);
}

/** Whether a value fits a type, without throwing. */
const fits = (value: unknown, type: TypeNode, depth: number): boolean => {
  try { checkValue(value, type, "value", depth); return true; } catch { return false; }
};

/**
 * Checks a value against a type, and throws a sentence that names what is wrong (`options.duration must be a number`).
 *
 * @param value - What the script gave.
 * @param type - The type of the parameter.
 * @param where - How the value is named in the error (`duration`, `options.tint`).
 */
export function checkValue(value: unknown, type: TypeNode, where: string, depth = 0): void {
  switch (type.kind) {
    case "any":
      if (value !== undefined) plainData(value, where, depth);
      return;
    case "primitive":
      if (type.name === "undefined") { if (value !== undefined) throw new Error(`${where} must not be given`); return; }
      if (type.name === "null") { if (value !== null) throw new Error(`${where} must be null`); return; }
      if (type.name === "object") { if (!isPlainObject(value)) throw new Error(`${where} must be plain data { ... }`); plainData(value, where, depth); return; }
      if (typeof value !== type.name) throw new Error(`${where} must be ${describe(type)}`);
      plainData(value, where, depth);
      return;
    case "literal":
      if (value !== type.value) throw new Error(`${where} must be ${describe(type)}`);
      return;
    case "union": {
      if (type.of.some((t) => fits(value, t, depth))) return;
      // the error of the one alternative that has the same kind of value says more than a list of every alternative
      const same = type.of.filter((t) => t.kind === "object" ? isPlainObject(value) : t.kind === "array" ? Array.isArray(value) : false);
      if (same.length === 1) checkValue(value, same[0], where, depth);
      throw new Error(`${where} must be ${describe(type)}`);
    }
    case "array":
      if (!Array.isArray(value)) throw new Error(`${where} must be ${describe(type)}`);
      if (value.length > MAX_LIST) throw new Error(`${where} holds ${MAX_LIST} entries at most`);
      value.forEach((v, i) => checkValue(v, type.of, `${where}[${i}]`, depth + 1));
      return;
    case "object": {
      if (!isPlainObject(value)) throw new Error(`${where} must be ${describe(type)}`);
      for (const [k, field] of Object.entries(type.fields)) {
        if (value[k] === undefined) { if (!field.optional) throw new Error(`${where}.${k} is missing`); continue; }
        checkValue(value[k], field.type, `${where}.${k}`, depth + 1);
      }
      for (const k of Object.keys(value)) {
        if (k in type.fields) continue;
        if (!type.index) throw new Error(`${where} takes ${Object.keys(type.fields).join(", ") || "nothing"} (not "${k}")`);
        checkValue(value[k], type.index, `${where}.${k}`, depth + 1);
      }
      return;
    }
  }
}

/** A parameter of a signature: its name, its type, and whether it may be left out. */
export interface SignatureParam { name: string; type: TypeNode; optional: boolean; rest: boolean }

/**
 * Reads a signature written as TypeScript (`(id: string, data?: object): void`): its parameters and what it returns.
 *
 * @returns The parameters and the return type, or `undefined` when the text is not a signature.
 */
export function readSignature(sig: string): { params: SignatureParam[]; returns: TypeNode; returnsNothing: boolean } | undefined {
  const text = sig.trim();
  if (!text.startsWith("(")) return undefined;
  const end = closes(text, 0);
  if (end < 0) return undefined;
  const params: SignatureParam[] = [];
  for (const part of splitTop(text.slice(1, end), ",")) {
    const match = /^(\.\.\.)?([A-Za-z_$][\w$]*)(\?)?\s*:\s*([\s\S]+)$/.exec(part);
    if (!match) return undefined;
    const rest = !!match[1];
    const type = parseType(rest && match[4].trim().endsWith("[]") ? match[4].trim().slice(0, -2) : match[4]);
    params.push({ name: match[2], type, optional: !!match[3] || rest, rest });
  }
  const returnText = text.slice(end + 1).replace(/^\s*:\s*/, "").trim();
  return { params, returns: parseType(returnText || "void"), returnsNothing: returnText === "void" || returnText === "" };
}

/**
 * Checks the arguments a script gives against a signature: each against the type of its parameter, the ones that are required
 * given, no more than it takes.
 *
 * @param label - How the call is named in an error (`$player.flash`).
 */
export function checkArguments(label: string, sig: string, args: unknown[]): void {
  const signature = readSignature(sig);
  if (!signature) return;
  const { params } = signature;
  const rest = params.find((p) => p.rest);
  if (!rest && args.length > params.length) throw new Error(`${label} takes ${params.length} argument${params.length === 1 ? "" : "s"} at most, got ${args.length}`);
  params.forEach((param, i) => {
    if (param.rest) { args.slice(i).forEach((value, j) => checkValue(value, param.type, `${param.name}[${j}]`)); return; }
    if (args[i] === undefined) { if (!param.optional) throw new Error(`${label} needs ${param.name}`); return; }
    checkValue(args[i], param.type, param.name);
  });
}
