import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import ts from "typescript";

/**
 * The declaration files of a package with `"type": "module"` are ES modules for TypeScript. Under
 * `moduleResolution: "node16"` or `"nodenext"`, their relative imports must name the file: `./math/Vector2.js`, not
 * `./math/Vector2`. Otherwise the re-exported names are missing and the others resolve to `any`.
 *
 * The sources keep extensionless imports (they are resolved by a bundler), so the specifiers are fixed in the emitted
 * declarations, once every file of the build is written: `./x` becomes `./x.js` when `x.d.ts` was emitted, and
 * `./x/index.js` when `x/index.d.ts` was.
 */

const RELATIVE = /^\.\.?(\/|$)/;
const RUNTIME_EXTENSION = /\.(c|m)?js$|\.json$/;
/** Files typed by an ambient `declare module "*.ce"` (or `*.vue`, `*.css`...), not by an emitted declaration. */
const ASSET_EXTENSION = /\.(ce|vue|css|scss|sass|less|png|jpe?g|gif|svg|webp|mp3|ogg|wav|wasm|txt)$/;

/** The module specifiers of a declaration file: imports, re-exports, `import("…")` types and `declare module "…"`. */
function moduleSpecifiers(source: ts.SourceFile): ts.StringLiteralLike[] {
  const found: ts.StringLiteralLike[] = [];
  const visit = (node: ts.Node): void => {
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && ts.isStringLiteralLike(node.moduleSpecifier)) {
      found.push(node.moduleSpecifier);
    } else if (ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument) && ts.isStringLiteralLike(node.argument.literal)) {
      found.push(node.argument.literal);
    } else if (ts.isModuleDeclaration(node) && ts.isStringLiteralLike(node.name)) {
      found.push(node.name);
    } else if (ts.isImportEqualsDeclaration(node) && ts.isExternalModuleReference(node.moduleReference) && ts.isStringLiteralLike(node.moduleReference.expression)) {
      found.push(node.moduleReference.expression);
    } else if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword && node.arguments[0] && ts.isStringLiteralLike(node.arguments[0])) {
      found.push(node.arguments[0]);
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return found;
}

/**
 * The specifier an ES module declaration needs for a relative import, or `undefined` when it cannot be resolved to an
 * emitted declaration (it is then left as it is).
 */
function withExtension(specifier: string, fromFile: string, exists: (path: string) => boolean): string | undefined {
  const base = resolve(dirname(fromFile), specifier);
  if (exists(`${base}.d.ts`)) return `${specifier}.js`;
  if (exists(join(base, "index.d.ts"))) return `${specifier.replace(/\/$/, "")}/index.js`;
  return undefined;
}

/**
 * Add the file extension to the relative imports of one declaration file. Comments are not touched.
 *
 * @param content - The content of the declaration file.
 * @param filePath - Its path, to resolve the relative imports.
 * @param exists - Whether a file exists; the file system by default.
 * @returns The new content, and the relative specifiers that resolve to no declaration.
 */
export function addDeclarationExtensions(
  content: string,
  filePath: string,
  exists: (path: string) => boolean = existsSync,
): { content: string; unresolved: string[] } {
  const edits: Array<{ start: number; end: number; text: string }> = [];
  const unresolved: string[] = [];
  const source = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, false, ts.ScriptKind.TS);
  for (const literal of moduleSpecifiers(source)) {
    const specifier = literal.text;
    if (!RELATIVE.test(specifier) || RUNTIME_EXTENSION.test(specifier)) continue;
    const next = withExtension(specifier, filePath, exists);
    if (!next) {
      if (!ASSET_EXTENSION.test(specifier)) unresolved.push(specifier);
      continue;
    }
    // Inside the quotes of the literal
    const start = literal.getStart(source) + 1;
    edits.push({ start, end: literal.end - 1, text: next });
  }
  let result = content;
  for (const edit of edits.sort((a, b) => b.start - a.start)) {
    result = result.slice(0, edit.start) + edit.text + result.slice(edit.end);
  }
  return { content: result, unresolved };
}

/** Why a relative import of a declaration file is at fault. */
export interface DeclarationSpecifierProblem {
  specifier: string;
  /**
   * - `extensionless`: its declaration exists but the import does not name the file, so it does not resolve under
   *   `moduleResolution: "nodenext"`.
   * - `missing`: it names no emitted declaration at all; its types are lost in every resolution mode.
   */
  reason: "extensionless" | "missing";
}

/**
 * The relative imports of one declaration file that are at fault: those that do not name their file, and those that
 * point to no emitted declaration.
 *
 * @param content - The content of the declaration file.
 * @param filePath - Its path, to resolve the relative imports.
 * @param exists - Whether a file exists; the file system by default.
 * @returns The problems, empty when the file is valid.
 */
export function declarationSpecifierProblems(
  content: string,
  filePath: string,
  exists: (path: string) => boolean = existsSync,
): DeclarationSpecifierProblem[] {
  const source = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, false, ts.ScriptKind.TS);
  const problems: DeclarationSpecifierProblem[] = [];
  for (const { text: specifier } of moduleSpecifiers(source)) {
    if (!RELATIVE.test(specifier) || ASSET_EXTENSION.test(specifier)) continue;
    const target = resolve(dirname(filePath), specifier);
    if (/\.json$/.test(specifier)) {
      if (!exists(target)) problems.push({ specifier, reason: "missing" });
      continue;
    }
    const runtime = /\.(c|m)?js$/.exec(specifier);
    if (runtime) {
      if (!exists(target.replace(/\.(c|m)?js$/, `.d.${runtime[1] ?? ""}ts`))) problems.push({ specifier, reason: "missing" });
      continue;
    }
    problems.push({ specifier, reason: withExtension(specifier, filePath, exists) ? "extensionless" : "missing" });
  }
  return problems;
}

/**
 * `afterBuild` hook for `vite-plugin-dts`: rewrites the relative imports of every emitted declaration file so the
 * declarations of an ES module package resolve under `moduleResolution: "node16"` and `"nodenext"` too.
 *
 * @example
 * ```ts
 * dts({ include: ["src/**\/*.ts"], afterBuild: fixDeclarationSpecifiers })
 * ```
 */
export async function fixDeclarationSpecifiers(emittedFiles: Map<string, string> | Iterable<string>): Promise<void> {
  const paths = emittedFiles instanceof Map ? [...emittedFiles.keys()] : [...emittedFiles];
  const unresolved: string[] = [];
  await Promise.all(
    paths
      .filter((path) => path.endsWith(".d.ts"))
      .map(async (path) => {
        const content = await readFile(path, "utf8");
        const fixed = addDeclarationExtensions(content, path);
        unresolved.push(...fixed.unresolved.map((specifier) => `${path}: ${specifier}`));
        if (fixed.content !== content) await writeFile(path, fixed.content, "utf8");
      }),
  );
  if (unresolved.length) {
    console.warn(`[rpgjs] ${unresolved.length} relative import(s) of the declarations resolve to no emitted file:\n  ${unresolved.join("\n  ")}`);
  }
}
