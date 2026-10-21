/**
 * What a script may use, described once as data, and what each environment does for it.
 *
 * - `ApiDescription` is plain data (names, types, documentation). The compiler checks scripts against it, and
 *   `describeApi` turns it into the TypeScript declarations given to an agent.
 * - `ApiImpl<W>` is what an environment supplies for a world `W`: the real game (a player, a map) or a simulation.
 *   `missingImplementations` proves that an implementation covers exactly what the description announces, so that a
 *   simulation cannot drift from the game by forgetting or inventing a name.
 */
import type { PayloadField, SignalDesc } from "./filter";
import type { ApiInfo, Host } from "./interpreter";

/** A member of a handle (`$player.gold`): its TypeScript type, its documentation, and whether a script may assign it. */
export interface MemberDesc { type: string; doc?: string; writable?: boolean }
/** A method of a handle (`$player.addItem(...)`): its signature as TypeScript, e.g. `(item: string): void`. A method that returns `void` cannot be used as a value. */
export interface MethodDesc { sig: string; doc?: string }
/** Members a handle takes by name (`$switch.door_open`, `$var.visits`): the description of the key, the type of the value, and whether a script may assign it. */
export interface DynamicDesc { keyDoc: string; type: string; doc?: string; writable?: boolean }
/** A `$name` a script can use: what it has (members, methods, a dynamic part), and whether its properties are declared by the script itself (`shared({ ... })`). */
export interface HandleDesc {
  doc?: string;
  /** Properties are declared by the script itself (`shared({ ... })`): `$shared.x` is checked against them. */
  declared?: boolean;
  members?: Record<string, MemberDesc>;
  methods?: Record<string, MethodDesc>;
  dynamic?: DynamicDesc;
}
/** A function a script can call. `ref` names the kind of record of the database a literal argument must be (`Item("potion")`), checked against the catalog when the script is checked. */
export interface FnDesc { sig: string; doc?: string; /** a reference to a record of the database, checked when the script is saved */ ref?: string }
/**
 * Everything a script may use, as plain data: the compiler refuses what is not here, `describeApi` turns it into the declarations
 * given to an agent, and each environment provides an `ApiImpl` for it.
 */
export interface ApiDescription {
  handles: Record<string, HandleDesc>;
  functions: Record<string, FnDesc>;
  /** The signals the game emits, which scripts listen to with `on("signal", ...)`. */
  signals?: Record<string, SignalDesc>;
}

/** What an environment does for a handle of the description, over a world `W`: the read and write of each member, each method, the dynamic part. */
export interface HandleImpl<W> {
  members?: Record<string, { read?: (w: W) => unknown; write?: (w: W, op: string, value: unknown) => void | Promise<void> }>;
  methods?: Record<string, (w: W, args: unknown[]) => unknown>;
  dynamic?: { read: (w: W, key: string) => unknown; write?: (w: W, key: string, op: string, value: unknown) => void | Promise<void> };
}
/** What an environment does for the whole description. `missingImplementations` proves it covers exactly what the description announces. */
export interface ApiImpl<W> {
  handles: Record<string, HandleImpl<W>>;
  functions: Record<string, (w: W, args: unknown[]) => unknown>;
}

const HANDLE = Symbol("handle"), HOSTFN = Symbol("host-fn");
const returnsNothing = (sig: string) => /\)\s*:\s*void\s*$/.test(sig);

/**
 * What the compiler needs to know about an API: names, members, methods, which functions return nothing, which are references,
 * and the signals.
 *
 * @param desc - The description of the API.
 * @param catalog - The ids a reference may take, by kind (`{ item: ["potion"] }`). A kind that is not given is not checked.
 * @returns The `ApiInfo` to give to `compileProgram`.
 */
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
    signals: desc.signals,
  };
}

/**
 * The names a script can use without declaring them: its handles (`$player`) and its functions (`say`).
 *
 * @param desc - The description of the API.
 * @returns The global names, to give to `compileProgram`.
 */
export const globalNames = (desc: ApiDescription) => [...Object.keys(desc.handles), ...Object.keys(desc.functions)];

const payloadType = (f: PayloadField): string =>
  f.type === "object" && f.fields ? `{ ${Object.entries(f.fields).map(([k, v]) => `${k}: ${payloadType(v)}`).join("; ")} }` : f.type === "object" ? "object" : f.type;

/**
 * The API as TypeScript declarations: what an agent is given to know what exists, with the documentation of every name and the
 * signals a script can listen to.
 *
 * @param desc - The description of the API.
 * @returns Declarations, as text.
 * @example
 * ```ts
 * const declarations = describeApi(GAME_API_DESCRIPTION) // declare const $player: { readonly level: number; ... }
 * ```
 */
export function describeApi(desc: ApiDescription): string {
  const out: string[] = ["// Script API. Scripts are a JavaScript subset; only what is declared here exists.", ""];
  for (const [name, h] of Object.entries(desc.handles)) {
    out.push(`${h.doc ? `/** ${h.doc} */\n` : ""}declare const ${name}: {`);
    for (const [k, m] of Object.entries(h.members ?? {})) out.push(`  ${m.doc ? `/** ${m.doc} */ ` : ""}${m.writable ? "" : "readonly "}${k}: ${m.type};`);
    for (const [k, m] of Object.entries(h.methods ?? {})) out.push(`  ${m.doc ? `/** ${m.doc} */ ` : ""}${k}${m.sig};`);
    if (h.declared) out.push("  // properties declared at the top of the script with shared({ name: { initial, client, persist } })");
    if (h.dynamic) out.push(`  ${h.dynamic.writable ? "" : "readonly "}[${h.dynamic.keyDoc}]: ${h.dynamic.type};`);
    out.push("};", "");
  }
  for (const [name, f] of Object.entries(desc.functions)) out.push(`${f.doc ? `/** ${f.doc} */\n` : ""}declare function ${name}${f.sig};`);
  if (desc.signals) {
    out.push("", "// Scripts listen to signals: on(\"signal\", handler) or on(\"signal\", { where?, when? }, handler). The handler receives the payload `e`, read-only.",
      "// where: { \"path.to.field\": value | { eq, ne, gt, gte, lt, lte, in: [...], has: value, exists: boolean } }  (all must hold)",
      "// when: [{ switch: name, is?: boolean } | { variable: name, <comparison> } | { item: id, <comparison> } | { stat: \"gold\" | \"level\", <comparison> }]  (all must hold)");
    for (const [name, sig] of Object.entries(desc.signals)) {
      out.push(`${sig.doc ? `/** ${sig.doc} */\n` : ""}declare function on(signal: "${name}", filter: { where?: object; when?: object[] }, handler: (e: ${payloadType({ type: "object", fields: sig.payload })}) => void): void;`);
      out.push(`declare function on(signal: "${name}", handler: (e: ${payloadType({ type: "object", fields: sig.payload })}) => void): void;`);
    }
  }
  out.push("", "// Also available: Math (min max floor ceil round abs sqrt pow trunc sign PI), Object (keys values entries), Array.isArray,",
    "// Number, String, Boolean, parseInt, parseFloat, isNaN, list methods (map filter find findIndex some every forEach reduce includes",
    "// indexOf join slice concat reverse sort push pop) and text methods (includes startsWith endsWith indexOf slice toUpperCase",
    "// toLowerCase trim split replaceAll). Data read from the game is read-only: copy it ({ ...x }, [...x]) before changing the copy.",
    "// Script entry points: export function name(...) {}, on(\"event\", () => {}), event({ name, x, y, pages: [page({ ... })] }).");
  return out.join("\n");
}

/**
 * Compares an implementation with its description: the names the description announces and the implementation lacks, and the
 * names the implementation has that nothing announces. A simulation that passes this cannot drift from the game by forgetting or
 * inventing a name.
 *
 * @param desc - The description of the API.
 * @param impl - The implementation to check.
 * @returns One sentence per problem. Empty when the implementation covers exactly the description.
 * @example
 * ```ts
 * expect(missingImplementations(GAME_API_DESCRIPTION, GAME_API_IMPL)).toEqual([])
 * ```
 */
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

/**
 * The facade a script runs against: handles and functions that exist only as far as the description says, and do what the
 * implementation does in the given world.
 *
 * @param desc - The description of the API.
 * @param impl - What each name does.
 * @param world - The world of this run (a player, a map…).
 * @returns The `Host` to give to `Program.call`, `Program.fire` or `Program.run`.
 */
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
