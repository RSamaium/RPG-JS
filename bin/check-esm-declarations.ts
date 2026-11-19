import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import { declarationSpecifierProblems } from "../packages/vite/src/esm-declarations";

/**
 * Checks that the published declarations of every ES module package resolve under `moduleResolution: "node16"` and
 * `"nodenext"`: a relative import whose declaration was emitted must name its file (`./x.js`, not `./x`). Without it, a
 * consumer compiled with `tsc` in that mode loses the re-exported names and gets `any` for the others. Imports that
 * point to no emitted declaration are reported as warnings.
 *
 * Run after `pnpm build`.
 */

const workspaceRoot = resolve(import.meta.dirname, "..");
const packagesDirectory = join(workspaceRoot, "packages");

async function declarationFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(entries.map(async (entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return entry.name === "node_modules" ? [] : declarationFiles(path);
    return entry.name.endsWith(".d.ts") ? [path] : [];
  }));
  return files.flat();
}

const problems: string[] = [];
const missing: string[] = [];
let checked = 0;
for (const entry of await readdir(packagesDirectory, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  const packageDirectory = join(packagesDirectory, entry.name);
  const packageJsonPath = join(packageDirectory, "package.json");
  if (!existsSync(packageJsonPath)) continue;
  const packageJson = JSON.parse(await readFile(packageJsonPath, "utf8")) as { name?: string; private?: boolean; type?: string };
  if (packageJson.private || packageJson.type !== "module") continue;
  const dist = join(packageDirectory, "dist");
  if (!existsSync(dist)) {
    problems.push(`${packageJson.name}: no dist directory, run pnpm build first`);
    continue;
  }
  for (const file of await declarationFiles(dist)) {
    checked += 1;
    for (const { specifier, reason } of declarationSpecifierProblems(await readFile(file, "utf8"), file)) {
      (reason === "extensionless" ? problems : missing).push(`${relative(workspaceRoot, file)}: '${specifier}'`);
    }
  }
}

// Imports to a declaration that was never emitted lose their types in every resolution mode. They do not come from
// the specifiers, so they are reported without failing the check.
if (missing.length) {
  console.warn(`${missing.length} relative import(s) of the published declarations point to no emitted declaration:\n  ${missing.join("\n  ")}\n`);
}

if (problems.length) {
  console.error(
    `${problems.length} relative import(s) of the published declarations do not resolve under moduleResolution "nodenext":\n  ${problems.slice(0, 50).join("\n  ")}${problems.length > 50 ? `\n  ... and ${problems.length - 50} more` : ""}\n`
    + "Declarations of an ES module package must name the file (./x.js). Build them with the afterBuild hook fixDeclarationSpecifiers (packages/vite/src/esm-declarations.ts).",
  );
  process.exit(1);
}
console.log(`Checked ${checked} declaration files; every relative import resolves under moduleResolution "nodenext".`);
