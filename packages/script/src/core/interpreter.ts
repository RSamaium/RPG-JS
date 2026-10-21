/**
 * Whitelist compiler and interpreter for a JavaScript subset.
 *
 * A tree (produced elsewhere, with acorn: see `../parse.ts`) goes in, closures come out. Nothing is ever eval'd.
 * This file is pure TypeScript with no import and no Node API: it runs in Node, in a browser and in a Cloudflare Worker /
 * Durable Object. The parser is deliberately not part of it, so that code that only runs trees does not carry it.
 *
 * What a script can touch is described once, as data, in `api.ts`; what it does is supplied by the environment.
 */

export type AstNode = { type: string; loc?: { start: { line: number } }; [key: string]: any };

export class CompileError extends Error {
  line: number;
  constructor(message: string, node?: AstNode) {
    super(`line ${node?.loc?.start.line ?? "?"}: ${message}`);
    this.line = node?.loc?.start.line ?? 0;
  }
}
export class CompileErrors extends Error {
  errors: CompileError[];
  constructor(errors: CompileError[]) {
    super(errors.map((e) => e.message).join("\n"));
    this.errors = errors;
  }
}
export class RuntimeError extends Error {}
export class BudgetExceeded extends Error {}

export interface Limits { steps: number; iterations: number; maxString?: number; maxList?: number; depth?: number }
const DEF = { maxString: 10_000, maxList: 1000, depth: 20 };

/** What a script may touch at run time. Values given to a script are primitives, plain data or handles. */
export interface Host {
  globals: Record<string, unknown>;
  read(obj: unknown, key: string): unknown;
  write(obj: unknown, key: string, op: string, value: unknown): void | Promise<void>;
  callMethod(obj: unknown, key: string, args: unknown[]): unknown;
  callFn(fn: unknown, args: unknown[]): unknown;
  isHandle(value: unknown): boolean;
  isHostFn(value: unknown): boolean;
}

/** What the compiler knows about the API, to refuse unknown names and collect permissions and references. */
export interface ApiInfo {
  handles: Record<string, { dynamic?: boolean; declared?: boolean; members: string[]; methods: string[]; voidMethods?: string[] }>;
  functions: Record<string, { ref?: string; void?: boolean }>;
  catalog?: Record<string, string[]>; // ref type -> known ids
}

export interface SharedDecl { name: string; initial: string | number | boolean | null; client: boolean; persist: boolean }
export interface Page { graphic?: string; trigger: string; when?: ScriptFn; run: ScriptFn }
export interface EventDecl { name?: string; x?: number; y?: number; pages: Page[] }

class Scope {
  vars = new Map<string, unknown>();
  parent?: Scope;
  constructor(parent?: Scope) { this.parent = parent; }
  find(name: string): Scope | undefined {
    for (let s: Scope | undefined = this; s; s = s.parent) if (s.vars.has(name)) return s;
    return undefined;
  }
}
type Run = { steps: number; depth: number; limits: Limits; host: Host; program: Program; covered?: Set<number> };
type Env = { scope: Scope; run: Run; ret?: unknown };
type C = { f: (env: Env) => any; a: boolean };
type Binder = (scope: Scope, value: unknown) => void;
type ScriptFn = { kind: "fn"; binders: Binder[]; body: C; exprBody?: C; closure: Scope; name: string };

const RET = Symbol("return"), BRK = Symbol("break"), CNT = Symbol("continue");
const NS = Symbol("namespace"), STDFN = Symbol("std-fn");
const DENIED = new Set(["constructor", "__proto__", "prototype", "__defineGetter__", "__defineSetter__", "__lookupGetter__", "__lookupSetter__"]);

const owned = new WeakSet<object>(); // objects and lists created by the script: the only ones it may mutate
const own = <T extends object>(o: T): T => (owned.add(o), o);
const isPlain = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v) && Object.getPrototypeOf(v) === Object.prototype;

const tick = (env: Env) => {
  if (++env.run.steps > env.run.limits.steps) throw new BudgetExceeded(`step budget of ${env.run.limits.steps} exceeded`);
};
const maxString = (env: Env) => env.run.limits.maxString ?? DEF.maxString;
const maxList = (env: Env) => env.run.limits.maxList ?? DEF.maxList;
const capString = (env: Env, v: unknown) => {
  if (typeof v === "string" && v.length > maxString(env)) throw new BudgetExceeded(`a text longer than ${maxString(env)} characters was built`);
  return v;
};
const capList = <T extends unknown[]>(env: Env, v: T): T => {
  if (v.length > maxList(env)) throw new BudgetExceeded(`a list longer than ${maxList(env)} items was built`);
  return v;
};

const BINARY: Record<string, (a: any, b: any) => unknown> = {
  "+": (a, b) => a + b, "-": (a, b) => a - b, "*": (a, b) => a * b, "/": (a, b) => a / b, "%": (a, b) => a % b, "**": (a, b) => a ** b,
  "<": (a, b) => a < b, "<=": (a, b) => a <= b, ">": (a, b) => a > b, ">=": (a, b) => a >= b,
  "===": (a, b) => a === b, "!==": (a, b) => a !== b, "==": (a, b) => a == b, "!=": (a, b) => a != b,
};
const UNARY: Record<string, (a: any) => unknown> = { "!": (a) => !a, "-": (a) => -a, "+": (a) => +a, typeof: (a) => typeof a };
const ASSIGN: Record<string, (cur: any, v: any) => unknown> = {
  "=": (_c, v) => v, "+=": (c, v) => c + v, "-=": (c, v) => c - v, "*=": (c, v) => c * v, "/=": (c, v) => c / v, "%=": (c, v) => c % v,
};

// ------------------------------------------------------------------ standard library (pure, implemented here)
const stdFn = (fn: (args: unknown[]) => unknown) => ({ [STDFN]: fn });
const ns = (members: Record<string, unknown>) => ({ [NS]: true, ...members });
const num = (x: unknown) => Number(x);
const STD: Record<string, unknown> = {
  undefined, NaN, Infinity,
  Math: ns({
    min: stdFn((a) => Math.min(...a.map(num))), max: stdFn((a) => Math.max(...a.map(num))),
    floor: stdFn((a) => Math.floor(num(a[0]))), ceil: stdFn((a) => Math.ceil(num(a[0]))), round: stdFn((a) => Math.round(num(a[0]))),
    abs: stdFn((a) => Math.abs(num(a[0]))), sqrt: stdFn((a) => Math.sqrt(num(a[0]))), pow: stdFn((a) => Math.pow(num(a[0]), num(a[1]))),
    trunc: stdFn((a) => Math.trunc(num(a[0]))), sign: stdFn((a) => Math.sign(num(a[0]))),
    PI: Math.PI,
  }),
  Object: ns({
    keys: stdFn((a) => own(isPlain(a[0]) ? Object.keys(a[0]) : [])),
    values: stdFn((a) => own(isPlain(a[0]) ? Object.values(a[0]) : [])),
    entries: stdFn((a) => own(isPlain(a[0]) ? Object.entries(a[0]).map((e) => own(e)) : [])),
  }),
  Array: ns({ isArray: stdFn((a) => Array.isArray(a[0])) }),
  Number: stdFn((a) => Number(a[0])), String: stdFn((a) => String(a[0])), Boolean: stdFn((a) => Boolean(a[0])),
  parseInt: stdFn((a) => parseInt(String(a[0]), 10)), parseFloat: stdFn((a) => parseFloat(String(a[0]))), isNaN: stdFn((a) => Number.isNaN(Number(a[0]))),
};
const isNs = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && NS in (v as object);
const isStdFn = (v: unknown): v is { [STDFN]: (a: unknown[]) => unknown } => !!v && typeof v === "object" && STDFN in (v as object);

async function invoke(env: Env, f: unknown, args: unknown[]): Promise<unknown> {
  if (!f || (f as ScriptFn).kind !== "fn") throw new RuntimeError("a function was expected");
  const fn = f as ScriptFn;
  tick(env);
  if (fn.exprBody && !fn.exprBody.a) {
    // fast path: a pure expression body runs without an asynchronous call
    const e: Env = { scope: new Scope(fn.closure), run: env.run };
    fn.binders.forEach((b, i) => b(e.scope, args[i]));
    return fn.exprBody.f(e);
  }
  return callScript(fn, args, env.run);
}

type Method = (env: Env, self: any, args: unknown[]) => unknown | Promise<unknown>;
const lim = (env: Env, n: number) => { if (n > env.run.limits.iterations) throw new BudgetExceeded(`${n} items exceed the loop limit of ${env.run.limits.iterations}`); };
const maybe = async (v: unknown) => (v instanceof Promise ? await v : v);
const defaultCmp = (a: any, b: any) => (String(a) < String(b) ? -1 : String(a) > String(b) ? 1 : 0);

const ARRAY: Record<string, Method> = {
  async map(env, a, [f]) { lim(env, a.length); const out: unknown[] = []; for (let i = 0; i < a.length; i++) out.push(await maybe(invoke(env, f, [a[i], i]))); return own(out); },
  async filter(env, a, [f]) { lim(env, a.length); const out: unknown[] = []; for (let i = 0; i < a.length; i++) if (await maybe(invoke(env, f, [a[i], i]))) out.push(a[i]); return own(out); },
  async find(env, a, [f]) { lim(env, a.length); for (let i = 0; i < a.length; i++) if (await maybe(invoke(env, f, [a[i], i]))) return a[i]; return undefined; },
  async findIndex(env, a, [f]) { lim(env, a.length); for (let i = 0; i < a.length; i++) if (await maybe(invoke(env, f, [a[i], i]))) return i; return -1; },
  async some(env, a, [f]) { lim(env, a.length); for (let i = 0; i < a.length; i++) if (await maybe(invoke(env, f, [a[i], i]))) return true; return false; },
  async every(env, a, [f]) { lim(env, a.length); for (let i = 0; i < a.length; i++) if (!(await maybe(invoke(env, f, [a[i], i])))) return false; return true; },
  async forEach(env, a, [f]) { lim(env, a.length); for (let i = 0; i < a.length; i++) await maybe(invoke(env, f, [a[i], i])); return undefined; },
  async reduce(env, a, args) {
    lim(env, a.length);
    let i = 0, acc: unknown;
    if (args.length > 1) acc = args[1]; else { if (!a.length) throw new RuntimeError("reduce of an empty list with no initial value"); acc = a[0]; i = 1; }
    for (; i < a.length; i++) acc = await maybe(invoke(env, args[0], [acc, a[i], i]));
    return acc;
  },
  includes: (_e, a, [x]) => a.includes(x),
  indexOf: (_e, a, [x]) => a.indexOf(x),
  join: (env, a, [sep]) => { lim(env, a.length); return capString(env, a.map(String).join(sep === undefined ? "," : String(sep))); },
  slice: (env, a, [s, e]) => own(capList(env, a.slice(s as number, e as number))),
  concat: (env, a, rest) => own(capList(env, a.concat(...rest.map((r) => (Array.isArray(r) ? r : [r]))))),
  reverse: (_e, a) => own([...a].reverse()),
  async sort(env, a, [cmp]) {
    lim(env, a.length);
    // merge sort so that an asynchronous comparator can be awaited and every comparison is counted
    const merge = async (xs: unknown[]): Promise<unknown[]> => {
      if (xs.length < 2) return xs;
      const mid = xs.length >> 1, l = await merge(xs.slice(0, mid)), r = await merge(xs.slice(mid)), out: unknown[] = [];
      let i = 0, j = 0;
      while (i < l.length && j < r.length) {
        const c = cmp === undefined ? defaultCmp(l[i], r[j]) : Number(await maybe(invoke(env, cmp, [l[i], r[j]])));
        out.push(c <= 0 ? l[i++] : r[j++]);
      }
      return out.concat(l.slice(i), r.slice(j));
    };
    return own(await merge(a));
  },
  push: (env, a, items) => { if (!owned.has(a)) throw new RuntimeError("this list is read-only: copy it first with [...list]"); a.push(...items); capList(env, a); return a.length; },
  pop: (_e, a) => { if (!owned.has(a)) throw new RuntimeError("this list is read-only: copy it first with [...list]"); return a.pop(); },
};
const STRING: Record<string, Method> = {
  includes: (_e, s, [x]) => s.includes(String(x)),
  startsWith: (_e, s, [x]) => s.startsWith(String(x)),
  endsWith: (_e, s, [x]) => s.endsWith(String(x)),
  indexOf: (_e, s, [x]) => s.indexOf(String(x)),
  slice: (_e, s, [a, b]) => s.slice(a as number, b as number),
  toUpperCase: (_e, s) => s.toUpperCase(),
  toLowerCase: (_e, s) => s.toLowerCase(),
  trim: (_e, s) => s.trim(),
  split: (env, s, [sep]) => own(capList(env, s.split(String(sep)))),
  replaceAll: (env, s, [a, b]) => capString(env, s.split(String(a)).join(String(b))),
};

// ------------------------------------------------------------------ program and execution
export class Program {
  fns = new Map<string, ScriptFn>();
  exported = new Set<string>();
  handlers: { event: string; fn: ScriptFn }[] = [];
  events: EventDecl[] = [];
  shared: SharedDecl[] = [];
  permissions = new Set<string>();
  lines = new Map<number, string>(); // executable statement lines -> top-level function that owns them
  refs: { function: string; id: string; line: number }[] = [];
  top = new Scope();

  /** Lines of statements that were never executed, by owner, as ranges: { vendre: "52-56" }. */
  uncovered(covered: Set<number>): Record<string, string> {
    const byOwner = new Map<string, number[]>();
    for (const [line, owner] of this.lines) if (!covered.has(line)) byOwner.set(owner, [...(byOwner.get(owner) ?? []), line]);
    const out: Record<string, string> = {};
    for (const [owner, lines] of byOwner) {
      lines.sort((a, b) => a - b);
      const ranges: string[] = [];
      for (let i = 0; i < lines.length; ) { let j = i; while (j + 1 < lines.length && lines[j + 1] === lines[j] + 1) j++; ranges.push(j > i ? `${lines[i]}-${lines[j]}` : `${lines[i]}`); i = j + 1; }
      out[owner] = ranges.join(", ");
    }
    return out;
  }

  async call(name: string, args: unknown[], host: Host, limits: Limits, cover?: Set<number>): Promise<{ value: unknown; steps: number }> {
    const fn = this.fns.get(name);
    if (!fn || !this.exported.has(name)) throw new RuntimeError(`"${name}" is not an exported function`);
    const run: Run = { steps: 0, depth: 0, limits, host, program: this, covered: cover };
    const value = await callScript(fn, args, run);
    return { value, steps: run.steps };
  }
  async fire(event: string, host: Host, limits: Limits, cover?: Set<number>) {
    for (const h of this.handlers.filter((x) => x.event === event)) await callScript(h.fn, [], { steps: 0, depth: 0, limits, host, program: this, covered: cover });
  }
  /** The page shown: the last whose condition holds (a page without condition always holds). */
  async pageIndex(eventIndex: number, host: Host, limits: Limits, cover?: Set<number>): Promise<number> {
    const ev = this.events[eventIndex];
    let found = -1;
    const run: Run = { steps: 0, depth: 0, limits, host, program: this, covered: cover };
    for (let i = 0; i < ev.pages.length; i++) {
      const p = ev.pages[i];
      if (!p.when || (await callScript(p.when, [], run))) found = i;
    }
    return found;
  }
  async runEvent(eventIndex: number, host: Host, limits: Limits, cover?: Set<number>): Promise<{ page: number; steps: number }> {
    const page = await this.pageIndex(eventIndex, host, limits, cover);
    if (page < 0) return { page, steps: 0 };
    const run: Run = { steps: 0, depth: 0, limits, host, program: this, covered: cover };
    await callScript(this.events[eventIndex].pages[page].run, [], run);
    return { page, steps: run.steps };
  }
}

async function callScript(fn: ScriptFn, args: unknown[], run: Run): Promise<unknown> {
  const max = run.limits.depth ?? DEF.depth;
  if (run.depth >= max) throw new BudgetExceeded(`call depth of ${max} exceeded`);
  run.depth++;
  try {
    const env: Env = { scope: new Scope(fn.closure), run };
    fn.binders.forEach((b, i) => b(env.scope, args[i]));
    const r = fn.body.a ? await fn.body.f(env) : fn.body.f(env);
    return r === RET ? env.ret : undefined;
  } finally {
    run.depth--;
  }
}

function readMember(env: Env, obj: unknown, key: string, node: AstNode): unknown {
  if (DENIED.has(key)) throw new RuntimeError(`line ${node.loc?.start.line}: access to "${key}" is not allowed`);
  if (isNs(obj)) { if (key in obj && key !== "constructor") return obj[key]; throw new RuntimeError(`line ${node.loc?.start.line}: "${key}" is not available`); }
  if (env.run.host.isHandle(obj)) return env.run.host.read(obj, key);
  if (Array.isArray(obj)) {
    if (key === "length") return obj.length;
    if (/^\d+$/.test(key)) return obj[Number(key)];
    throw new RuntimeError(`line ${node.loc?.start.line}: "${key}" is not available on a list (call it as a method)`);
  }
  if (isPlain(obj)) return Object.prototype.hasOwnProperty.call(obj, key) ? obj[key] : undefined;
  if (typeof obj === "string") { if (key === "length") return obj.length; if (/^\d+$/.test(key)) return obj[Number(key)]; }
  throw new RuntimeError(`line ${node.loc?.start.line}: cannot read "${key}" of ${obj === null ? "null" : typeof obj}`);
}

// ------------------------------------------------------------------ compiler
export function compileProgram(ast: AstNode, hostGlobalNames: string[], api?: ApiInfo): Program {
  const program = new Program();
  const errors: CompileError[] = [];
  const known = new Set<string>([...hostGlobalNames, ...Object.keys(STD)]);
  const scopes: Set<string>[] = [new Set()];
  const declared = (n: string) => scopes.some((s) => s.has(n));
  const push = () => scopes.push(new Set());
  const pop = () => scopes.pop();
  const declare = (n: string) => scopes[scopes.length - 1].add(n);
  const fail = (msg: string, node: AstNode): never => { throw new CompileError(msg, node); };
  const guard = <T>(node: AstNode, f: () => T, fallback: T): T => {
    try { return f(); } catch (e) { if (e instanceof CompileError) { errors.push(e); return fallback; } throw e; }
  };
  const NOOP: C = { f: () => undefined, a: false };
  let owner = "?", fnDepth = 0;
  const statementCalls = new Set<AstNode>(); // calls whose result is ignored on purpose: allowed even when they return nothing
  const noValue = (what: string, node: AstNode): never => fail(`${what} returns nothing (void): its result cannot be used. Call it on its own line, and test the situation before or after.`, node);

  const isDenied = (k: string, node: AstNode) => { if (DENIED.has(k)) fail(`access to "${k}" is not allowed`, node); };
  const memberCheck = (objNode: AstNode, key: string, node: AstNode, method: boolean) => {
    if (objNode.type !== "Identifier" || !api) return;
    const h = api.handles[objNode.name];
    if (!h || declared(objNode.name)) return;
    if (h.declared && !method) {
      if (!program.shared.some((d) => d.name === key)) fail(`"${objNode.name}.${key}" is not declared. Declare it with shared({ ${key}: { initial: 0 } }). Declared: ${program.shared.map((d) => d.name).join(", ") || "none"}`, node);
    } else if (!h.dynamic) {
      const list = method ? h.methods : h.members;
      if (!list.includes(key)) fail(`"${objNode.name}.${key}" does not exist. Available ${method ? "methods" : "members"} of ${objNode.name}: ${list.join(", ") || "none"}`, node);
    }
    program.permissions.add(`${objNode.name.replace(/^\$/, "")}.${h.dynamic ? "*" : key}`);
  };

  // ---- patterns (destructuring)
  const patternNames = (p: AstNode): string[] => {
    if (p.type === "Identifier") return [p.name];
    if (p.type === "ObjectPattern") return p.properties.flatMap((pr: AstNode) => {
      if (pr.type !== "Property" || pr.computed || pr.value.type !== "Identifier" || pr.key.type !== "Identifier") fail("only simple destructuring is available: const { a, b } = obj", pr);
      isDenied(pr.key.name, pr);
      return [pr.value.name];
    });
    if (p.type === "ArrayPattern") return p.elements.flatMap((el: AstNode | null) => {
      if (el && el.type !== "Identifier") fail("only simple destructuring is available: const [a, b] = list", el);
      return el ? [el.name] : [];
    });
    return fail(`"${p.type}" is not available as a variable pattern`, p);
  };
  const binderFor = (p: AstNode): Binder => {
    if (p.type === "Identifier") { const n = p.name; return (s, v) => { s.vars.set(n, v); }; }
    if (p.type === "ObjectPattern") {
      const pairs: [string, string][] = p.properties.map((pr: AstNode) => [pr.key.name, pr.value.name]);
      return (s, v) => { for (const [k, n] of pairs) s.vars.set(n, isPlain(v) && Object.prototype.hasOwnProperty.call(v, k) ? v[k] : undefined); };
    }
    const names: (string | null)[] = p.elements.map((el: AstNode | null) => (el ? el.name : null));
    return (s, v) => { names.forEach((n, i) => { if (n) s.vars.set(n, Array.isArray(v) ? v[i] : undefined); }); };
  };

  // ---- expressions
  const combine = (kids: C[], fn: (vals: any[], env: Env) => any): C => {
    if (kids.every((k) => !k.a)) {
      if (kids.length === 1) { const k = kids[0]; return { a: false, f: (env) => { tick(env); return fn([k.f(env)], env); } }; }
      return { a: false, f: (env) => { tick(env); return fn(kids.map((k) => k.f(env)), env); } };
    }
    return { a: true, f: async (env) => { tick(env); const vals = []; for (const k of kids) vals.push(k.a ? await k.f(env) : k.f(env)); return fn(vals, env); } };
  };

  const expr = (n: AstNode): C => {
    switch (n.type) {
      case "Literal": { if (n.regex) fail("regular expressions are not available", n); const v = n.value; return { f: () => v, a: false }; }
      case "Identifier": {
        const name = n.name;
        if (!declared(name) && !known.has(name)) fail(`unknown name "${name}"`, n);
        return { a: false, f: (env) => {
          const s = env.scope.find(name);
          if (s) return s.vars.get(name);
          if (name in STD) return STD[name];
          return env.run.host.globals[name];
        } };
      }
      case "TemplateLiteral": {
        const parts = n.expressions.map(expr);
        const quasis = n.quasis.map((q: AstNode) => q.value.cooked as string);
        return combine(parts, (vals, env) => capString(env, quasis.reduce((acc: string, q: string, i: number) => acc + q + (i < vals.length ? String(vals[i]) : ""), "")));
      }
      case "BinaryExpression": {
        const op = BINARY[n.operator];
        if (!op) fail(`operator "${n.operator}" is not available`, n);
        return combine([expr(n.left), expr(n.right)], ([a, b], env) => capString(env, op(a, b)));
      }
      case "UnaryExpression": {
        const op = UNARY[n.operator];
        if (!op) fail(`operator "${n.operator}" is not available`, n);
        if (n.operator === "typeof" && n.argument.type === "Identifier" && !declared(n.argument.name) && !known.has(n.argument.name)) return { a: false, f: () => "undefined" };
        return combine([expr(n.argument)], ([a]) => op(a));
      }
      case "LogicalExpression": {
        const l = expr(n.left), r = expr(n.right), op = n.operator;
        if (!l.a && !r.a) return { a: false, f: (env) => { tick(env); const x = l.f(env); return op === "&&" ? (x ? r.f(env) : x) : op === "||" ? (x ? x : r.f(env)) : x ?? r.f(env); } };
        return { a: true, f: async (env) => { tick(env); const x = l.a ? await l.f(env) : l.f(env); const go = op === "&&" ? !!x : op === "||" ? !x : x == null; return go ? (r.a ? await r.f(env) : r.f(env)) : x; } };
      }
      case "ConditionalExpression": {
        const t = expr(n.test), c = expr(n.consequent), a = expr(n.alternate);
        if (!t.a && !c.a && !a.a) return { a: false, f: (env) => { tick(env); return t.f(env) ? c.f(env) : a.f(env); } };
        return { a: true, f: async (env) => { tick(env); const x = t.a ? await t.f(env) : t.f(env); const b = x ? c : a; return b.a ? await b.f(env) : b.f(env); } };
      }
      case "ArrayExpression": {
        const parts = n.elements.map((el: AstNode | null) => {
          if (!el) fail("holes in lists are not available", n);
          return el!.type === "SpreadElement" ? { spread: true, c: expr(el!.argument) } : { spread: false, c: expr(el!) };
        });
        const kids: C[] = parts.map((p: any) => p.c);
        return combine(kids, (vals, env) => {
          const out: unknown[] = [];
          vals.forEach((v, i) => {
            if (parts[i].spread) { if (!Array.isArray(v)) throw new RuntimeError("only a list can be spread in a list"); out.push(...v); } else out.push(v);
            if (out.length > maxList(env)) throw new BudgetExceeded(`a list longer than ${maxList(env)} items was built`);
          });
          return own(out);
        });
      }
      case "ObjectExpression": {
        const parts = n.properties.map((p: AstNode) => {
          if (p.type === "SpreadElement") return { spread: true, key: "", c: expr(p.argument) };
          if (p.type !== "Property" || p.computed || p.kind !== "init" || p.method) fail("only plain properties are available in objects", p);
          const key = p.key.type === "Identifier" ? p.key.name : String(p.key.value);
          isDenied(key, p);
          return { spread: false, key, c: expr(p.value) };
        });
        return combine(parts.map((p: any) => p.c), (vals, env) => {
          const out: Record<string, unknown> = {};
          vals.forEach((v, i) => {
            if (parts[i].spread) {
              if (env.run.host.isHandle(v) || isNs(v)) throw new RuntimeError("a handle of the game ($player, $shared…) cannot be spread: read its members one by one");
              if (isPlain(v)) { for (const k of Object.keys(v)) if (!DENIED.has(k)) out[k] = v[k]; }
              else if (v != null) throw new RuntimeError("only an object can be spread in an object");
            }
            else out[parts[i].key] = v;
            if (Object.keys(out).length > maxList(env)) throw new BudgetExceeded(`an object with more than ${maxList(env)} keys was built`);
          });
          return own(out);
        });
      }
      case "MemberExpression": {
        if (n.optional) fail("optional chaining is not available, use ?? or check first", n);
        const obj = expr(n.object);
        if (!n.computed) {
          const key = n.property.name;
          isDenied(key, n);
          memberCheck(n.object, key, n, false);
          return combine([obj], ([o], env) => readMember(env, o, key, n));
        }
        return combine([obj, expr(n.property)], ([o, k], env) => readMember(env, o, String(k), n));
      }
      case "CallExpression": return call(n);
      case "AssignmentExpression": return assignment(n);
      case "ArrowFunctionExpression": return fnValue(n);
      case "ChainExpression": return fail("optional chaining is not available, use ?? or check first", n);
      case "FunctionExpression": return fail("write an arrow function: (x) => ...", n);
      case "UpdateExpression": return fail("++ and -- are only available as a statement or in a for loop; write i += 1 elsewhere", n);
      default:
        return fail(`"${n.type}" is not available in Studio scripts`, n);
    }
  };

  type Arg = { c: C; spread: boolean };
  const argList = (n: AstNode): Arg[] => n.arguments.map((a: AstNode) => (a.type === "SpreadElement" ? { c: expr(a.argument), spread: true } : { c: expr(a), spread: false }));
  const evalArgs = async (args: Arg[], env: Env) => {
    const v: unknown[] = [];
    for (const a of args) {
      const x = a.c.a ? await a.c.f(env) : a.c.f(env);
      if (a.spread) { if (!Array.isArray(x)) throw new RuntimeError("only a list can be spread in a call"); v.push(...x); } else v.push(x);
      if (v.length > maxList(env)) throw new BudgetExceeded(`a call with more than ${maxList(env)} arguments`);
    }
    return v;
  };

  const call = (n: AstNode): C => {
    const callee = n.callee;
    const args = argList(n);
    if (callee.type === "Identifier") {
      const name = callee.name;
      if (!declared(name) && !known.has(name)) fail(`unknown name "${name}"`, callee);
      const info = api?.functions[name];
      if (info?.void && !declared(name) && !statementCalls.has(n)) noValue(`"${name}"`, n);
      if (info?.ref && n.arguments[0]?.type === "Literal") {
        const id = String(n.arguments[0].value);
        program.refs.push({ function: name, id, line: n.loc?.start.line ?? 0 });
        const ids = api?.catalog?.[info.ref];
        if (ids && !ids.includes(id)) fail(`unknown ${info.ref} "${id}"`, n);
        return { a: false, f: (env) => { tick(env); return id; } }; // a reference is just its id: no host call needed
      } else if (info?.ref) fail(`${name}(...) needs a literal text, for example ${name}("id")`, n);
      return { a: true, f: async (env) => {
        tick(env);
        const vals = await evalArgs(args, env);
        const local = env.scope.find(name)?.vars.get(name) as ScriptFn | undefined;
        if (local && local.kind === "fn") return callScript(local, vals, env.run);
        const top = env.run.program.fns.get(name);
        if (top) return callScript(top, vals, env.run);
        const g = name in STD ? STD[name] : env.run.host.globals[name];
        if (isStdFn(g)) return g[STDFN](vals);
        if (env.run.host.isHostFn(g)) return env.run.host.callFn(g, vals);
        throw new RuntimeError(`line ${n.loc?.start.line}: "${name}" is not a function`);
      } };
    }
    if (callee.type === "MemberExpression" && !callee.computed) {
      const obj = expr(callee.object), key = callee.property.name;
      isDenied(key, n);
      memberCheck(callee.object, key, n, true);
      if (callee.object.type === "Identifier" && !declared(callee.object.name) && api?.handles[callee.object.name]?.voidMethods?.includes(key) && !statementCalls.has(n)) noValue(`"${callee.object.name}.${key}"`, n);
      return { a: true, f: async (env) => {
        tick(env);
        const o = obj.a ? await obj.f(env) : obj.f(env);
        const vals = await evalArgs(args, env);
        if (isNs(o)) { const g = o[key]; if (isStdFn(g)) return g[STDFN](vals); throw new RuntimeError(`line ${n.loc?.start.line}: "${key}" is not a function`); }
        if (env.run.host.isHandle(o)) return env.run.host.callMethod(o, key, vals);
        if (Array.isArray(o) && Object.prototype.hasOwnProperty.call(ARRAY, key)) return ARRAY[key](env, o, vals);
        if (typeof o === "string" && Object.prototype.hasOwnProperty.call(STRING, key)) return STRING[key](env, o, vals);
        throw new RuntimeError(`line ${n.loc?.start.line}: "${key}" is not available on ${Array.isArray(o) ? "a list" : typeof o}`);
      } };
    }
    return fail("this kind of call is not available", n);
  };

  const assignment = (n: AstNode): C => {
    const apply = ASSIGN[n.operator];
    if (!apply) fail(`operator "${n.operator}" is not available`, n);
    const op = n.operator as string, value = expr(n.right), t = n.left;
    if (t.type === "Identifier") {
      const name = t.name;
      if (!declared(name)) fail(`unknown name "${name}"`, t);
      return { a: value.a, f: (env) => {
        tick(env);
        const set = (v: any) => { const s = env.scope.find(name); if (!s) throw new RuntimeError(`line ${n.loc?.start.line}: unknown name "${name}"`); s.vars.set(name, capString(env, apply(s.vars.get(name), v))); };
        if (value.a) return (value.f(env) as Promise<any>).then(set);
        set(value.f(env));
      } };
    }
    if (t.type === "MemberExpression") {
      const obj = expr(t.object);
      const key: C = t.computed ? expr(t.property) : { f: () => t.property.name, a: false };
      if (!t.computed) { isDenied(t.property.name, t); memberCheck(t.object, t.property.name, t, false); }
      return { a: true, f: async (env) => {
        tick(env);
        const o = obj.a ? await obj.f(env) : obj.f(env);
        const k = String(key.a ? await key.f(env) : key.f(env));
        const v = value.a ? await value.f(env) : value.f(env);
        if (DENIED.has(k)) throw new RuntimeError(`line ${n.loc?.start.line}: access to "${k}" is not allowed`);
        if (env.run.host.isHandle(o)) return env.run.host.write(o, k, op, v);
        if (owned.has(o as object) && (isPlain(o) || Array.isArray(o))) {
          const cur = (o as any)[k];
          (o as any)[k] = capString(env, apply(cur, v));
          if (Array.isArray(o)) capList(env, o);
          return;
        }
        throw new RuntimeError(`line ${n.loc?.start.line}: this data is read-only. Copy it first (const copy = { ...data }), change the copy, then assign the copy`);
      } };
    }
    return fail("cannot assign to this", n);
  };

  // ---- functions
  const fnValue = (n: AstNode): C => {
    const compiled = compileFn(n, "<arrow>");
    return { a: false, f: (env) => ({ ...compiled, closure: env.scope } as ScriptFn) };
  };
  const compileFn = (n: AstNode, name: string): ScriptFn => {
    if (n.async || n.generator) fail("async and generator functions are not available", n);
    const prevOwner = owner;
    if (fnDepth === 0) owner = name;
    fnDepth++;
    push();
    const binders = n.params.map((p: AstNode) => { patternNames(p).forEach(declare); return binderFor(p); });
    let body: C, exprBody: C | undefined;
    if (n.body.type === "BlockStatement") body = block(n.body, false);
    else {
      statementCalls.add(n.body); // (x) => $player.addItem(x): a callback that does something and returns nothing
      exprBody = expr(n.body);
      const e = exprBody;
      body = { a: e.a, f: e.a ? async (env) => { env.ret = await e.f(env); return RET; } : (env) => { env.ret = e.f(env); return RET; } };
    }
    pop();
    fnDepth--;
    owner = prevOwner;
    return { kind: "fn", binders, body, exprBody, closure: program.top, name };
  };

  // ---- statements
  const hoist = (body: AstNode[]) => {
    for (const s of body) {
      if (s.type === "FunctionDeclaration") declare(s.id.name);
      else if (s.type === "VariableDeclaration") s.declarations.forEach((d: AstNode) => patternNames(d.id).forEach(declare));
    }
  };
  const block = (n: AstNode, newScope = true): C => {
    if (newScope) push();
    hoist(n.body);
    const fnDecls: { name: string; fn: ScriptFn }[] = [];
    const body: C[] = [];
    for (const s of n.body) {
      if (s.type === "FunctionDeclaration") { guard(s, () => fnDecls.push({ name: s.id.name, fn: compileFn(s, s.id.name) }), undefined); continue; }
      body.push(guard(s, () => stmt(s), NOOP));
    }
    if (newScope) pop();
    const enter = (env: Env): Env => {
      const e: Env = { scope: new Scope(env.scope), run: env.run };
      for (const d of fnDecls) e.scope.vars.set(d.name, { ...d.fn, closure: e.scope });
      return e;
    };
    const lift = (env: Env, e: Env, r: unknown) => { if (r === RET) env.ret = e.ret; return r; };
    if (body.every((b) => !b.a)) return { a: false, f: (env) => { const e = enter(env); for (const b of body) { const r = b.f(e); if (r !== undefined) return lift(env, e, r); } } };
    return { a: true, f: async (env) => { const e = enter(env); for (const b of body) { const r = b.a ? await b.f(e) : b.f(e); if (r !== undefined) return lift(env, e, r); } } };
  };

  const loopBody = async (env: Env, body: C, scope: Scope): Promise<unknown> => {
    const e: Env = { scope, run: env.run };
    const r = body.a ? await body.f(e) : body.f(e);
    if (r === RET) env.ret = e.ret;
    return r;
  };
  const iterCap = (env: Env, i: number) => { if (i > env.run.limits.iterations) throw new BudgetExceeded(`a loop ran more than ${env.run.limits.iterations} times`); };

  const stmt = (n: AstNode): C => {
    const c = stmt0(n);
    if (n.type === "BlockStatement" || n.type === "EmptyStatement" || n.type === "FunctionDeclaration") return c;
    const line = n.loc?.start.line ?? 0;
    program.lines.set(line, owner);
    return { a: c.a, f: (env) => { if (env.run.covered) env.run.covered.add(line); return c.f(env); } };
  };
  const stmt0 = (n: AstNode): C => {
    switch (n.type) {
      case "EmptyStatement": return NOOP;
      case "ExpressionStatement": {
        statementCalls.add(n.expression);
        if (n.expression.type === "UpdateExpression") return update(n.expression);
        const e = expr(n.expression);
        return { a: e.a, f: e.a ? async (env) => { await e.f(env); } : (env) => { e.f(env); } };
      }
      case "VariableDeclaration": {
        if (n.kind === "var") fail("use const or let", n);
        const ds = n.declarations.map((d: AstNode) => {
          patternNames(d.id).forEach(declare);
          if (d.id.type !== "Identifier" && !d.init) fail("a destructuring declaration needs a value", d);
          return { bind: binderFor(d.id), init: d.init ? expr(d.init) : null };
        });
        const anyAsync = ds.some((d: any) => d.init?.a);
        return { a: anyAsync, f: anyAsync
          ? async (env) => { for (const d of ds) d.bind(env.scope, d.init ? (d.init.a ? await d.init.f(env) : d.init.f(env)) : undefined); }
          : (env) => { for (const d of ds) d.bind(env.scope, d.init ? d.init.f(env) : undefined); } };
      }
      case "ReturnStatement": {
        const e = n.argument ? expr(n.argument) : null;
        if (!e) return { a: false, f: (env) => { env.ret = undefined; return RET; } };
        return { a: e.a, f: e.a ? async (env) => { env.ret = await e.f(env); return RET; } : (env) => { env.ret = e.f(env); return RET; } };
      }
      case "BreakStatement": if (n.label) fail("labels are not available", n); return { a: false, f: () => BRK };
      case "ContinueStatement": if (n.label) fail("labels are not available", n); return { a: false, f: () => CNT };
      case "IfStatement": {
        const t = expr(n.test), c = stmt(n.consequent), a = n.alternate ? stmt(n.alternate) : null;
        if (!t.a && !c.a && !(a?.a)) return { a: false, f: (env) => { tick(env); return t.f(env) ? c.f(env) : a ? a.f(env) : undefined; } };
        return { a: true, f: async (env) => { tick(env); const x = t.a ? await t.f(env) : t.f(env); const b = x ? c : a; return b ? (b.a ? await b.f(env) : b.f(env)) : undefined; } };
      }
      case "BlockStatement": return block(n);
      case "ForOfStatement": {
        if (n.await) fail("for await is not available", n);
        if (n.left.type !== "VariableDeclaration") fail("write: for (const x of list)", n);
        push();
        const pat = n.left.declarations[0].id;
        patternNames(pat).forEach(declare);
        const bind = binderFor(pat), list = expr(n.right), body = stmt(n.body);
        pop();
        return { a: true, f: async (env) => {
          const items = list.a ? await list.f(env) : list.f(env);
          if (!Array.isArray(items)) throw new RuntimeError(`line ${n.loc?.start.line}: for...of needs a list`);
          lim(env, items.length);
          for (const item of items) {
            tick(env);
            const scope = new Scope(env.scope);
            bind(scope, item);
            const r = await loopBody(env, body, scope);
            if (r === RET) return RET;
            if (r === BRK) break;
          }
        } };
      }
      case "ForStatement": {
        push();
        const init = n.init ? (n.init.type === "VariableDeclaration" ? stmt(n.init) : stmt({ type: "ExpressionStatement", expression: n.init, loc: n.loc })) : NOOP;
        const test = n.test ? expr(n.test) : null;
        const upd = n.update ? (n.update.type === "UpdateExpression" ? update(n.update) : stmt({ type: "ExpressionStatement", expression: n.update, loc: n.loc })) : NOOP;
        const body = stmt(n.body);
        pop();
        return { a: true, f: async (env) => {
          const outer = new Scope(env.scope);
          const oe: Env = { scope: outer, run: env.run };
          if (init.a) await init.f(oe); else init.f(oe);
          for (let i = 1; ; i++) {
            tick(env);
            if (test) { const ok = test.a ? await test.f(oe) : test.f(oe); if (!ok) break; }
            iterCap(env, i);
            const r = await loopBody(env, body, new Scope(outer));
            if (r === RET) return RET;
            if (r === BRK) break;
            if (upd.a) await upd.f(oe); else upd.f(oe);
          }
        } };
      }
      case "WhileStatement": {
        const test = expr(n.test), body = stmt(n.body);
        return { a: true, f: async (env) => {
          for (let i = 1; ; i++) {
            tick(env);
            const ok = test.a ? await test.f(env) : test.f(env);
            if (!ok) break;
            iterCap(env, i);
            const r = await loopBody(env, body, new Scope(env.scope));
            if (r === RET) return RET;
            if (r === BRK) break;
          }
        } };
      }
      case "SwitchStatement": {
        const disc = expr(n.discriminant);
        push();
        const cases = n.cases.map((c: AstNode) => ({ test: c.test ? expr(c.test) : null, body: c.consequent.map((s: AstNode) => guard(s, () => stmt(s), NOOP)) as C[] }));
        pop();
        return { a: true, f: async (env) => {
          const d = disc.a ? await disc.f(env) : disc.f(env);
          const e: Env = { scope: new Scope(env.scope), run: env.run };
          let start = -1;
          for (let i = 0; i < cases.length; i++) {
            if (!cases[i].test) continue;
            const t = cases[i].test!; const v = t.a ? await t.f(e) : t.f(e);
            if (v === d) { start = i; break; }
          }
          if (start < 0) start = cases.findIndex((c: any) => !c.test);
          if (start < 0) return;
          for (let i = start; i < cases.length; i++) {
            for (const b of cases[i].body) {
              const r = b.a ? await b.f(e) : b.f(e);
              if (r === BRK) return;
              if (r !== undefined) { if (r === RET) env.ret = e.ret; return r; }
            }
          }
        } };
      }
      case "FunctionDeclaration": return fail("declare functions at the start of a block or at the top level", n);
      default:
        return fail(`"${n.type}" is not available in Studio scripts`, n);
    }
  };

  const update = (n: AstNode): C => {
    const delta = n.operator === "++" ? "+=" : "-=";
    return stmt({ type: "ExpressionStatement", loc: n.loc, expression: { type: "AssignmentExpression", operator: delta, left: n.argument, right: { type: "Literal", value: 1, loc: n.loc }, loc: n.loc } });
  };

  // ---- event / page declarations
  const literal = (n: AstNode | undefined, what: string): any => {
    if (!n || n.type !== "Literal") return fail(`${what} must be a plain value`, n ?? ast);
    return n.value;
  };
  const prop = (o: AstNode, key: string) => o.properties.find((p: AstNode) => p.type === "Property" && !p.computed && (p.key.name === key || p.key.value === key))?.value as AstNode | undefined;
  const asFn = (n: AstNode, name: string): ScriptFn => {
    if (n.type === "ArrowFunctionExpression") return compileFn(n, name);
    if (n.type === "Identifier") {
      if (!declared(n.name)) fail(`unknown function "${n.name}"`, n);
      // resolved after all functions are compiled
      return { kind: "fn", binders: [], body: { a: true, f: async (env) => { const f = env.run.program.fns.get(n.name); if (!f) throw new RuntimeError(`"${n.name}" is not a function`); const r = await callScript(f, [], env.run); env.ret = r; return RET; } }, closure: program.top, name: n.name };
    }
    return fail("a page needs an arrow function or the name of a function", n);
  };
  const eventDecl = (call: AstNode) => {
    const o = call.arguments[0];
    if (!o || o.type !== "ObjectExpression") fail("event({ name, x, y, pages: [...] })", call);
    const pagesNode = prop(o, "pages");
    if (!pagesNode || pagesNode.type !== "ArrayExpression") fail("event needs pages: [page({ ... })]", call);
    const decl: EventDecl = { name: prop(o, "name") ? literal(prop(o, "name"), "name") : undefined, x: prop(o, "x") ? literal(prop(o, "x"), "x") : undefined, y: prop(o, "y") ? literal(prop(o, "y"), "y") : undefined, pages: [] };
    for (const pc of pagesNode!.elements as AstNode[]) {
      if (pc.type !== "CallExpression" || pc.callee.name !== "page" || pc.arguments[0]?.type !== "ObjectExpression") fail("write page({ trigger, run, ... })", pc);
      const po = pc.arguments[0];
      const g = prop(po, "graphic");
      let graphic: string | undefined;
      if (g) {
        if (g.type !== "CallExpression" || g.callee.name !== "Graphic" || g.arguments[0]?.type !== "Literal") fail('graphic must be Graphic("id")', g);
        graphic = String(g.arguments[0].value);
        program.refs.push({ function: "Graphic", id: graphic, line: g.loc?.start.line ?? 0 });
        const ids = api?.catalog?.graphic;
        if (ids && !ids.includes(graphic)) fail(`unknown graphic "${graphic}"`, g);
      }
      const trigger = literal(prop(po, "trigger"), "trigger");
      if (!["action", "touch", "auto", "parallel"].includes(trigger)) fail(`unknown trigger "${trigger}" (action, touch, auto, parallel)`, po);
      const whenN = prop(po, "when"), runN = prop(po, "run");
      if (!runN) fail("a page needs run: ...", po);
      decl.pages.push({ graphic, trigger, when: whenN ? asFn(whenN, "when") : undefined, run: asFn(runN!, "run") });
    }
    program.events.push(decl);
  };

  // ---- shared properties: shared({ name: { initial, client, persist } }), collected before anything else is compiled
  const sharedDecl = (call: AstNode) => {
    const o = call.arguments[0];
    if (!o || o.type !== "ObjectExpression") fail("shared({ name: { initial: 0, client: true, persist: false } })", call);
    for (const p of o.properties as AstNode[]) {
      if (p.type !== "Property" || p.computed || p.value.type !== "ObjectExpression") fail("each shared property is written name: { initial, client, persist }", p);
      const name = p.key.type === "Identifier" ? p.key.name : String(p.key.value);
      if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name) || DENIED.has(name)) fail(`"${name}" is not a valid shared property name`, p);
      if (program.shared.some((d) => d.name === name)) fail(`shared property "${name}" is declared twice`, p);
      const get = (k: string) => { const v = prop(p.value, k); return v === undefined ? undefined : literal(v, k); };
      const initial = get("initial") ?? null;
      if (initial !== null && !["number", "string", "boolean"].includes(typeof initial)) fail(`"initial" of "${name}" must be a number, a text, true/false or null`, p);
      if (typeof initial === "string" && initial.length > 500) fail(`"initial" of "${name}" is longer than 500 characters`, p);
      program.shared.push({ name, initial, client: get("client") !== false, persist: get("persist") === true });
    }
    if (program.shared.length > 20) fail("a script may declare at most 20 shared properties", call);
  };
  const isSharedCall = (n: AstNode) => n.type === "ExpressionStatement" && n.expression.type === "CallExpression" && n.expression.callee.name === "shared";
  if (ast.type === "Program") for (const n of ast.body) if (isSharedCall(n)) guard(n, () => sharedDecl(n.expression), undefined);

  // ---- top level
  if (ast.type !== "Program") fail("expected a program", ast);
  hoist(ast.body.filter((s: AstNode) => s.type !== "ExportNamedDeclaration"));
  for (const s of ast.body) if (s.type === "ExportNamedDeclaration" && s.declaration?.type === "FunctionDeclaration") declare(s.declaration.id.name);
  const topConsts: { name: string; init: AstNode }[] = [];
  for (const n of ast.body) guard(n, () => {
    const declareFn = (d: AstNode, exported: boolean) => {
      program.fns.set(d.id.name, compileFn(d, d.id.name));
      if (exported) program.exported.add(d.id.name);
    };
    if (isSharedCall(n)) return; // already collected above
    if (n.type === "FunctionDeclaration") declareFn(n, false);
    else if (n.type === "ExportNamedDeclaration" && n.declaration?.type === "FunctionDeclaration") declareFn(n.declaration, true);
    else if (n.type === "VariableDeclaration" && n.declarations.length === 1 && n.declarations[0].init?.type === "CallExpression" && n.declarations[0].init.callee.name === "event") eventDecl(n.declarations[0].init);
    else if (n.type === "ExpressionStatement" && n.expression.type === "CallExpression" && n.expression.callee.name === "event") eventDecl(n.expression);
    else if (n.type === "ExpressionStatement" && n.expression.type === "CallExpression" && n.expression.callee.name === "on") {
      const [ev, fn] = n.expression.arguments;
      if (ev?.type !== "Literal" || typeof ev.value !== "string" || !fn) fail('write: on("event", () => { ... })', n);
      program.handlers.push({ event: ev.value, fn: asFn(fn, `on:${ev.value}`) });
    } else if (n.type === "VariableDeclaration" && n.kind === "const" && n.declarations.every((d: AstNode) => d.id.type === "Identifier" && d.init && (d.init.type === "Literal" || d.init.type === "ArrayExpression" || d.init.type === "ObjectExpression" || d.init.type === "ArrowFunctionExpression"))) {
      for (const d of n.declarations) topConsts.push({ name: d.id.name, init: d.init });
    } else fail(`"${n.type}" is not available at the top level (functions, const data, event(...) and on(...))`, n);
  }, undefined);

  // top-level constants and arrow functions are evaluated once, in the program scope
  for (const c of topConsts) {
    const e = guard(c.init, () => expr(c.init), NOOP);
    if (e.a) { errors.push(new CompileError("a top-level constant cannot call a function", c.init)); continue; }
    const value = e.f({ scope: program.top, run: { steps: 0, depth: 0, limits: { steps: 1e6, iterations: 1e6 }, host: null as any, program } });
    const readOnly = (v: unknown) => { if (v && typeof v === "object" && (v as ScriptFn).kind !== "fn") { owned.delete(v as object); Object.values(v as object).forEach(readOnly); } };
    readOnly(value);
    program.top.vars.set(c.name, value);
  }
  if (errors.length) throw new CompileErrors(errors);
  return program;
}
