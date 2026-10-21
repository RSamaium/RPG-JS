/**
 * What a script may use, described once as data, and what each environment does for it.
 *
 * - `ApiDescription` is plain data (names, types, documentation). The compiler checks scripts against it, and
 *   `describeApi` turns it into the TypeScript declarations given to an agent.
 * - `ApiImpl<W>` is what an environment supplies for a world `W`: the real game (a player, a map) or a simulation.
 *   `missingImplementations` proves that an implementation covers exactly what the description announces, so that a
 *   simulation cannot drift from the game by forgetting or inventing a name.
 */
import type { ApiInfo, Host } from "./interpreter";

export interface MemberDesc { type: string; doc?: string; writable?: boolean }
export interface MethodDesc { sig: string; doc?: string }
export interface DynamicDesc { keyDoc: string; type: string; doc?: string; writable?: boolean }
export interface HandleDesc {
  doc?: string;
  /** Properties are declared by the script itself (`shared({ ... })`): `$shared.x` is checked against them. */
  declared?: boolean;
  members?: Record<string, MemberDesc>;
  methods?: Record<string, MethodDesc>;
  dynamic?: DynamicDesc;
}
export interface FnDesc { sig: string; doc?: string; /** a reference to a record of the database, checked when the script is saved */ ref?: string }
export interface ApiDescription { handles: Record<string, HandleDesc>; functions: Record<string, FnDesc> }

export interface HandleImpl<W> {
  members?: Record<string, { read?: (w: W) => unknown; write?: (w: W, op: string, value: unknown) => void | Promise<void> }>;
  methods?: Record<string, (w: W, args: unknown[]) => unknown>;
  dynamic?: { read: (w: W, key: string) => unknown; write?: (w: W, key: string, op: string, value: unknown) => void | Promise<void> };
}
export interface ApiImpl<W> {
  handles: Record<string, HandleImpl<W>>;
  functions: Record<string, (w: W, args: unknown[]) => unknown>;
}

const HANDLE = Symbol("handle"), HOSTFN = Symbol("host-fn");
const returnsNothing = (sig: string) => /\)\s*:\s*void\s*$/.test(sig);

/** What the compiler needs to know: names, members, methods, which functions return nothing, which are references. */
export function apiInfo(desc: ApiDescription, catalog?: Record<string, string[]>): ApiInfo {
  return {
    handles: Object.fromEntries(Object.entries(desc.handles).map(([name, h]) => [name, {
      dynamic: !!h.dynamic,
      declared: !!h.declared,
      members: Object.keys(h.members ?? {}),
      methods: Object.keys(h.methods ?? {}),
      voidMethods: Object.entries(h.methods ?? {}).filter(([, m]) => returnsNothing(m.sig)).map(([k]) => k),
    }])),
    functions: Object.fromEntries(Object.entries(desc.functions).map(([name, f]) => [name, { ref: f.ref, void: returnsNothing(f.sig) }])),
    catalog,
  };
}

export const globalNames = (desc: ApiDescription) => [...Object.keys(desc.handles), ...Object.keys(desc.functions)];

/** TypeScript declarations: what an agent is given to know what exists. */
export function describeApi(desc: ApiDescription): string {
  const out: string[] = ["// Studio script API. Scripts are a JavaScript subset; only what is declared here exists.", ""];
  for (const [name, h] of Object.entries(desc.handles)) {
    out.push(`${h.doc ? `/** ${h.doc} */\n` : ""}declare const ${name}: {`);
    for (const [k, m] of Object.entries(h.members ?? {})) out.push(`  ${m.doc ? `/** ${m.doc} */ ` : ""}${m.writable ? "" : "readonly "}${k}: ${m.type};`);
    for (const [k, m] of Object.entries(h.methods ?? {})) out.push(`  ${m.doc ? `/** ${m.doc} */ ` : ""}${k}${m.sig};`);
    if (h.declared) out.push("  // properties declared at the top of the script with shared({ name: { initial, client, persist } })");
    if (h.dynamic) out.push(`  ${h.dynamic.writable ? "" : "readonly "}[${h.dynamic.keyDoc}]: ${h.dynamic.type};`);
    out.push("};", "");
  }
  for (const [name, f] of Object.entries(desc.functions)) out.push(`${f.doc ? `/** ${f.doc} */\n` : ""}declare function ${name}${f.sig};`);
  out.push("", "// Also available: Math (min max floor ceil round abs sqrt pow trunc sign PI), Object (keys values entries), Array.isArray,",
    "// Number, String, Boolean, parseInt, parseFloat, isNaN, list methods (map filter find findIndex some every forEach reduce includes",
    "// indexOf join slice concat reverse sort push pop) and text methods (includes startsWith endsWith indexOf slice toUpperCase",
    "// toLowerCase trim split replaceAll). Data read from the game is read-only: copy it ({ ...x }, [...x]) before changing the copy.",
    "// Script entry points: export function name(...) {}, on(\"event\", () => {}), event({ name, x, y, pages: [page({ ... })] }).");
  return out.join("\n");
}

/** Names the description announces and the implementation lacks, and the other way round. Both must be empty. */
export function missingImplementations<W>(desc: ApiDescription, impl: ApiImpl<W>): string[] {
  const problems: string[] = [];
  for (const [name, h] of Object.entries(desc.handles)) {
    const i = impl.handles[name];
    if (!i) { problems.push(`handle ${name} is not implemented`); continue; }
    for (const k of Object.keys(h.members ?? {})) {
      if (!i.members?.[k]?.read) problems.push(`${name}.${k} has no read`);
      if (h.members![k].writable && !i.members?.[k]?.write) problems.push(`${name}.${k} is writable but has no write`);
      if (!h.members![k].writable && i.members?.[k]?.write) problems.push(`${name}.${k} has a write but is not writable`);
    }
    for (const k of Object.keys(h.methods ?? {})) if (!i.methods?.[k]) problems.push(`${name}.${k}() is not implemented`);
    if (h.dynamic) {
      if (!i.dynamic?.read) problems.push(`${name}[...] has no read`);
      if (h.dynamic.writable && !i.dynamic?.write) problems.push(`${name}[...] is writable but has no write`);
    } else if (i.dynamic) problems.push(`${name}[...] is implemented but not described`);
    for (const k of Object.keys(i.members ?? {})) if (!h.members?.[k]) problems.push(`${name}.${k} is implemented but not described`);
    for (const k of Object.keys(i.methods ?? {})) if (!h.methods?.[k]) problems.push(`${name}.${k}() is implemented but not described`);
  }
  for (const name of Object.keys(impl.handles)) if (!desc.handles[name]) problems.push(`handle ${name} is implemented but not described`);
  for (const name of Object.keys(desc.functions)) if (!impl.functions[name]) problems.push(`function ${name}() is not implemented`);
  for (const name of Object.keys(impl.functions)) if (!desc.functions[name]) problems.push(`function ${name}() is implemented but not described`);
  return problems;
}

/** The facade a script runs against: handles and functions that exist only as far as the description says. */
export function hostFromApi<W>(desc: ApiDescription, impl: ApiImpl<W>, world: W): Host {
  const handles: Record<string, unknown> = {};
  for (const name of Object.keys(desc.handles)) handles[name] = { [HANDLE]: name };
  const fns: Record<string, unknown> = {};
  for (const name of Object.keys(desc.functions)) fns[name] = { [HOSTFN]: name };
  const nameOf = (o: unknown) => (o as any)[HANDLE] as string;
  return {
    globals: { ...handles, ...fns },
    isHandle: (v) => !!v && typeof v === "object" && HANDLE in (v as object),
    isHostFn: (v) => !!v && typeof v === "object" && HOSTFN in (v as object),
    read(obj, key) {
      const name = nameOf(obj), d = desc.handles[name], i = impl.handles[name];
      if (d.members?.[key]) return i.members![key].read!(world);
      if (d.dynamic) return i.dynamic!.read(world, key);
      throw new Error(`"${name}.${key}" cannot be read`);
    },
    write(obj, key, op, value) {
      const name = nameOf(obj), d = desc.handles[name], i = impl.handles[name];
      if (d.members?.[key]) {
        if (!d.members[key].writable) throw new Error(`"${name}.${key}" cannot be assigned`);
        return i.members![key].write!(world, op, value);
      }
      if (d.dynamic?.writable) return i.dynamic!.write!(world, key, op, value);
      throw new Error(`"${name}.${key}" cannot be assigned`);
    },
    callMethod(obj, key, args) {
      const name = nameOf(obj);
      if (!desc.handles[name].methods?.[key]) throw new Error(`"${name}.${key}()" does not exist`);
      return impl.handles[name].methods![key](world, args);
    },
    callFn: (fn, args) => impl.functions[(fn as any)[HOSTFN]](world, args),
  };
}
